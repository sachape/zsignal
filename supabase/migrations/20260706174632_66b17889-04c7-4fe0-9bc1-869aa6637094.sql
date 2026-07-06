
-- 1) RPC: current user knows if they received the welcome bonus.
CREATE OR REPLACE FUNCTION public.has_welcome_bonus()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.creator_credit_ledger
    WHERE user_id = auth.uid()
      AND reason = 'bonus'
      AND metadata->>'kind' = 'welcome'
  );
$$;

REVOKE ALL ON FUNCTION public.has_welcome_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_welcome_bonus() TO authenticated;

-- 2) Backfill: give 470 SC to every existing profile that never received the welcome bonus.
--    Idempotent thanks to creator_credit_ledger_welcome_bonus_uniq partial unique index.
INSERT INTO public.creator_credit_ledger (user_id, delta, reason, metadata)
SELECT
  p.user_id,
  470,
  'bonus',
  jsonb_build_object(
    'kind', 'welcome',
    'label', 'Bonus de bienvenue',
    'backfill', true,
    'backfilled_at', now()
  )
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.creator_credit_ledger l
  WHERE l.user_id = p.user_id
    AND l.reason = 'bonus'
    AND l.metadata->>'kind' = 'welcome'
)
ON CONFLICT DO NOTHING;
