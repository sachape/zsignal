
-- Idempotent welcome bonus: partial unique index prevents duplicates
CREATE UNIQUE INDEX IF NOT EXISTS creator_credit_ledger_welcome_bonus_uniq
  ON public.creator_credit_ledger (user_id)
  WHERE reason = 'bonus' AND metadata->>'kind' = 'welcome';

-- Update handle_new_user to grant a 470 StreamCoins welcome bonus (1 clip + 1 visual)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  -- Welcome bonus: 470 StreamCoins = 1 clip (350) + 1 visual (120).
  -- Idempotent via partial unique index; must never block signup.
  BEGIN
    INSERT INTO public.creator_credit_ledger (user_id, delta, reason, metadata)
    VALUES (
      NEW.id,
      470,
      'bonus',
      jsonb_build_object('kind', 'welcome', 'label', 'Bonus de bienvenue')
    );
  EXCEPTION
    WHEN unique_violation THEN NULL;
    WHEN OTHERS THEN
      RAISE WARNING 'welcome bonus insert failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
