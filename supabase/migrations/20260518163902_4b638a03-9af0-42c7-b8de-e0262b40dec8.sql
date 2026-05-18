ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS active_connected_account_id uuid
    REFERENCES public.connected_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_preferences_active_account
  ON public.user_preferences(active_connected_account_id);