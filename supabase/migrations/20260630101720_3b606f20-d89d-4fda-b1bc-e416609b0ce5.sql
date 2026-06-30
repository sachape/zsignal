
-- StreamCoins: extend credit_packages with display metadata + reseed packs (all inactive).

ALTER TABLE public.credit_packages
  ADD COLUMN IF NOT EXISTS display_price_cents integer,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'eur',
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS description text;

-- Deprecate legacy packs (already inactive, keep rows for FK safety, rename so ops sees they're dead).
UPDATE public.credit_packages
SET is_active = false,
    stripe_price_id = NULL,
    display_name = CASE WHEN display_name LIKE '[DEPRECATED]%' THEN display_name ELSE '[DEPRECATED] ' || display_name END,
    display_order = 900 + display_order,
    updated_at = now()
WHERE id IN ('pack_10','pack_30','pack_80');

-- Seed StreamCoins packs (x10 scale). All inactive until ops sets stripe_price_id.
INSERT INTO public.credit_packages
  (id, credits, stripe_price_id, display_name, display_order, is_active, display_price_cents, currency, badge, description)
VALUES
  ('pack_1200',  1200,  NULL, '1 200 StreamCoins',  1, false, 1200,  'eur', NULL,            'Idéal pour tester'),
  ('pack_3000',  3000,  NULL, '3 000 StreamCoins',  2, false, 2700,  'eur', NULL,            'Pour créer plusieurs contenus'),
  ('pack_7000',  7000,  NULL, '7 000 StreamCoins',  3, false, 5900,  'eur', 'Meilleur deal', 'Meilleur deal'),
  ('pack_16000', 16000, NULL, '16 000 StreamCoins', 4, false, 12900, 'eur', NULL,            'Volume élevé')
ON CONFLICT (id) DO UPDATE SET
  credits = EXCLUDED.credits,
  display_name = EXCLUDED.display_name,
  display_order = EXCLUDED.display_order,
  display_price_cents = EXCLUDED.display_price_cents,
  currency = EXCLUDED.currency,
  badge = EXCLUDED.badge,
  description = EXCLUDED.description,
  updated_at = now();
