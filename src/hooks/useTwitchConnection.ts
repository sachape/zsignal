import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TwitchAccount {
  id: string;
  platform_login: string | null;
  platform_display_name: string | null;
  platform_user_id: string | null;
  created_at: string;
  /** Twitch profile image (joined from twitch_profiles when available). */
  profile_image_url?: string | null;
}

export function useTwitchConnection() {
  const { user } = useAuth();
  const [account, setAccount] = useState<TwitchAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAccount(null);
      setLoading(false);
      return;
    }

    const fetchAccount = async () => {
      setLoading(true);
      const { data: connected } = await supabase
        .from("connected_accounts")
        .select("id, platform_login, platform_display_name, platform_user_id, created_at")
        .eq("user_id", user.id)
        .eq("platform", "twitch")
        .maybeSingle();

      if (!connected) {
        setAccount(null);
        setLoading(false);
        return;
      }

      // Best-effort avatar lookup. Failure is non-fatal — fallback to initials.
      const { data: profile } = await supabase
        .from("twitch_profiles")
        .select("profile_image_url")
        .eq("user_id", user.id)
        .maybeSingle();

      setAccount({ ...connected, profile_image_url: profile?.profile_image_url ?? null });
      setLoading(false);
    };

    fetchAccount();
  }, [user]);

  return {
    isConnected: !!account,
    account,
    loading,
  };
}
