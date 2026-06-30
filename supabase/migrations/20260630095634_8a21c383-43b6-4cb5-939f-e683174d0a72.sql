-- ============================================================
-- Pay As You Go — Credit ledger, packages, job billing columns
-- ============================================================
-- Architecture: append-only ledger (source of truth) + RPCs
-- transactionnelles pour consume/refund. Quotas mensuels existants
-- restent inchangés.

-- ─────────────────────────────────────────────────────────────
-- 1. credit_packages : catalogue des packs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.credit_packages (
  id text PRIMARY KEY,                        -- 'pack_10', 'pack_30', 'pack_80'
  credits integer NOT NULL CHECK (credits > 0),
  stripe_price_id text,                       -- NULL tant que prix non créé côté Stripe
  display_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,   -- OFF par défaut tant que prix Stripe absent
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.credit_packages TO authenticated, anon;
GRANT ALL ON public.credit_packages TO service_role;

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Packs actifs lisibles par tous"
  ON public.credit_packages FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE TRIGGER trg_credit_packages_updated_at
  BEFORE UPDATE ON public.credit_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.credit_packages (id, credits, display_name, display_order, is_active)
VALUES
  ('pack_10', 10, '10 crédits', 1, false),
  ('pack_30', 30, '30 crédits', 2, false),
  ('pack_80', 80, '80 crédits', 3, false);

-- ─────────────────────────────────────────────────────────────
-- 2. creator_credit_ledger : append-only
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.creator_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL CHECK (delta <> 0),
  reason text NOT NULL CHECK (reason IN (
    'purchase',
    'spend_visual_generation',
    'spend_clip_generation',
    'refund_failed_job',
    'bonus',
    'admin_adjustment'
  )),
  feature text CHECK (feature IS NULL OR feature IN ('visual_generation', 'clip_generation')),
  related_job_id uuid,
  related_job_table text CHECK (related_job_table IS NULL OR related_job_table IN (
    'visual_generation_jobs', 'creator_video_generation_jobs'
  )),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  credit_package_id text REFERENCES public.credit_packages(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotency Stripe : un même checkout ne peut créditer qu'une fois.
CREATE UNIQUE INDEX uq_credit_ledger_stripe_session
  ON public.creator_credit_ledger (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Idempotency refund : un job ne peut être remboursé qu'une fois.
CREATE UNIQUE INDEX uq_credit_ledger_refund_per_job
  ON public.creator_credit_ledger (related_job_id, related_job_table)
  WHERE reason = 'refund_failed_job' AND related_job_id IS NOT NULL;

CREATE INDEX idx_credit_ledger_user_created
  ON public.creator_credit_ledger (user_id, created_at DESC);

GRANT SELECT ON public.creator_credit_ledger TO authenticated;
GRANT ALL ON public.creator_credit_ledger TO service_role;

ALTER TABLE public.creator_credit_ledger ENABLE ROW LEVEL SECURITY;

-- User peut lire son propre ledger uniquement. Aucun INSERT/UPDATE/DELETE
-- pour authenticated : tout passe par les RPC SECURITY DEFINER ci-dessous.
CREATE POLICY "Utilisateurs lisent leur propre ledger"
  ON public.creator_credit_ledger FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. Colonnes billing sur les jobs
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.visual_generation_jobs
  ADD COLUMN IF NOT EXISTS billing_source text
    CHECK (billing_source IS NULL OR billing_source IN ('monthly_quota','credits')),
  ADD COLUMN IF NOT EXISTS credits_spent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_ledger_entry_id uuid
    REFERENCES public.creator_credit_ledger(id) ON DELETE SET NULL;

ALTER TABLE public.creator_video_generation_jobs
  ADD COLUMN IF NOT EXISTS billing_source text
    CHECK (billing_source IS NULL OR billing_source IN ('monthly_quota','credits')),
  ADD COLUMN IF NOT EXISTS credits_spent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_ledger_entry_id uuid
    REFERENCES public.creator_credit_ledger(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. RPC : get_user_credit_balance
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_credit_balance(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_available integer := 0;
  v_purchased integer := 0;
  v_spent integer := 0;
  v_refunded integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'available_credits', 0,
      'lifetime_purchased', 0,
      'lifetime_spent', 0,
      'lifetime_refunded', 0
    );
  END IF;

  -- Un user ne peut consulter QUE son propre solde via cette RPC.
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_uid THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT
    COALESCE(SUM(delta), 0),
    COALESCE(SUM(delta) FILTER (WHERE reason IN ('purchase','bonus','admin_adjustment') AND delta > 0), 0),
    COALESCE(-SUM(delta) FILTER (WHERE delta < 0), 0),
    COALESCE(SUM(delta) FILTER (WHERE reason = 'refund_failed_job'), 0)
  INTO v_available, v_purchased, v_spent, v_refunded
  FROM public.creator_credit_ledger
  WHERE user_id = v_uid
    AND (expires_at IS NULL OR expires_at > now());

  RETURN jsonb_build_object(
    'available_credits', GREATEST(0, v_available),
    'lifetime_purchased', v_purchased,
    'lifetime_spent', v_spent,
    'lifetime_refunded', v_refunded
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_credit_balance(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. RPC : consume_generation_credit (atomique, anti-race)
-- ─────────────────────────────────────────────────────────────
-- Verrouille via advisory lock par user pour empêcher 2 jobs concurrents
-- de dépasser le solde. Vérifie le solde, insère le débit, retourne l'id.
CREATE OR REPLACE FUNCTION public.consume_generation_credit(
  p_user_id uuid,
  p_feature text,
  p_cost integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_entry_id uuid;
  v_reason text;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id_required'; END IF;
  IF p_cost IS NULL OR p_cost <= 0 THEN RAISE EXCEPTION 'invalid_cost'; END IF;
  IF p_feature NOT IN ('visual_generation','clip_generation') THEN
    RAISE EXCEPTION 'invalid_feature';
  END IF;

  v_reason := CASE p_feature
    WHEN 'visual_generation' THEN 'spend_visual_generation'
    WHEN 'clip_generation'   THEN 'spend_clip_generation'
  END;

  -- Lock per-user pour sérialiser les consommations concurrentes.
  PERFORM pg_advisory_xact_lock(hashtext('credit_consume:' || p_user_id::text));

  SELECT COALESCE(SUM(delta), 0) INTO v_balance
  FROM public.creator_credit_ledger
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now());

  IF v_balance < p_cost THEN
    RETURN NULL; -- insuffisant : le caller renverra 402.
  END IF;

  INSERT INTO public.creator_credit_ledger (user_id, delta, reason, feature, metadata)
  VALUES (p_user_id, -p_cost, v_reason, p_feature,
          jsonb_build_object('balance_before', v_balance))
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_generation_credit(uuid, text, integer) FROM public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.consume_generation_credit(uuid, text, integer) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 6. RPC : refund_failed_job_credits (idempotent)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refund_failed_job_credits(
  p_job_id uuid,
  p_job_table text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_credits_spent integer;
  v_billing_source text;
  v_feature text;
  v_entry_id uuid;
BEGIN
  IF p_job_table NOT IN ('visual_generation_jobs','creator_video_generation_jobs') THEN
    RAISE EXCEPTION 'invalid_job_table';
  END IF;

  IF p_job_table = 'visual_generation_jobs' THEN
    SELECT user_id, credits_spent, billing_source, 'visual_generation'
      INTO v_user_id, v_credits_spent, v_billing_source, v_feature
      FROM public.visual_generation_jobs WHERE id = p_job_id;
  ELSE
    SELECT user_id, credits_spent, billing_source, 'clip_generation'
      INTO v_user_id, v_credits_spent, v_billing_source, v_feature
      FROM public.creator_video_generation_jobs WHERE id = p_job_id;
  END IF;

  IF v_user_id IS NULL THEN RETURN NULL; END IF;
  IF v_billing_source IS DISTINCT FROM 'credits' THEN RETURN NULL; END IF;
  IF v_credits_spent IS NULL OR v_credits_spent <= 0 THEN RETURN NULL; END IF;

  -- Idempotent : l'index unique partiel rejette tout doublon.
  BEGIN
    INSERT INTO public.creator_credit_ledger (
      user_id, delta, reason, feature, related_job_id, related_job_table, metadata
    ) VALUES (
      v_user_id, v_credits_spent, 'refund_failed_job', v_feature,
      p_job_id, p_job_table,
      jsonb_build_object('refunded_credits', v_credits_spent)
    )
    RETURNING id INTO v_entry_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN NULL; -- déjà remboursé
  END;

  RETURN v_entry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_failed_job_credits(uuid, text) FROM public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.refund_failed_job_credits(uuid, text) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 7. Patch cleanup_orphaned_generation_jobs pour refund auto
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_generation_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visual_count int := 0;
  v_clip_count int := 0;
  v_refunds int := 0;
  r record;
BEGIN
  WITH updated AS (
    UPDATE public.visual_generation_jobs
    SET status = 'failed',
        error_code = 'timeout_orphaned_job',
        error_message = 'La génération a pris trop de temps et a été arrêtée automatiquement.',
        completed_at = now(),
        updated_at = now()
    WHERE status = 'processing'
      AND COALESCE(started_at, updated_at, created_at) < now() - interval '15 minutes'
    RETURNING id, billing_source, credits_spent
  )
  SELECT count(*) INTO v_visual_count FROM updated;

  FOR r IN
    SELECT id FROM public.visual_generation_jobs
    WHERE error_code = 'timeout_orphaned_job'
      AND completed_at > now() - interval '2 minutes'
      AND billing_source = 'credits' AND credits_spent > 0
  LOOP
    IF public.refund_failed_job_credits(r.id, 'visual_generation_jobs') IS NOT NULL THEN
      v_refunds := v_refunds + 1;
    END IF;
  END LOOP;

  WITH updated AS (
    UPDATE public.creator_video_generation_jobs
    SET status = 'failed',
        generation_stage = 'failed',
        error_code = 'timeout_orphaned_job',
        error_message = 'La génération a pris trop de temps et a été arrêtée automatiquement.',
        completed_at = now(),
        worker_completed_at = COALESCE(worker_completed_at, now()),
        updated_at = now()
    WHERE status IN ('processing','rendering','uploading','transcribing','queued')
      AND COALESCE(worker_last_seen_at, worker_started_at, updated_at, created_at) < now() - interval '30 minutes'
    RETURNING id, billing_source, credits_spent
  )
  SELECT count(*) INTO v_clip_count FROM updated;

  FOR r IN
    SELECT id FROM public.creator_video_generation_jobs
    WHERE error_code = 'timeout_orphaned_job'
      AND completed_at > now() - interval '2 minutes'
      AND billing_source = 'credits' AND credits_spent > 0
  LOOP
    IF public.refund_failed_job_credits(r.id, 'creator_video_generation_jobs') IS NOT NULL THEN
      v_refunds := v_refunds + 1;
    END IF;
  END LOOP;

  UPDATE public.creator_content_items ci
  SET status = 'to_generate',
      generation_status = 'failed',
      generation_error = 'La génération a pris trop de temps. Tu peux réessayer.'
  FROM public.creator_video_generation_jobs j
  WHERE j.content_item_id = ci.id
    AND j.error_code = 'timeout_orphaned_job'
    AND j.completed_at > now() - interval '2 minutes';

  RETURN jsonb_build_object(
    'visual_jobs_failed', v_visual_count,
    'clip_jobs_failed', v_clip_count,
    'credits_refunded_entries', v_refunds,
    'ran_at', now()
  );
END;
$$;