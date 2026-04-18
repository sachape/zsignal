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
      // 1) Try cached twitch_profiles row for this user.
      let avatar: string | null = null;
      const { data: profile } = await supabase
        .from("twitch_profiles")
        .select("profile_image_url, twitch_user_id, login")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.profile_image_url) avatar = profile.profile_image_url;

      // 2) Fallback: resolve via public lookup edge function using login.
      if (!avatar && connected.platform_login) {
        try {
          const { data: lookup } = await supabase.functions.invoke("twitch-public-lookup", {
            body: { login: connected.platform_login },
          });
          const url = lookup?.profile?.profile_image_url ?? lookup?.profile_image_url ?? null;
          if (url) avatar = url;
        } catch {
          // ignore — avatar stays null and UI falls back to initials
        }
      }

      setAccount({ ...connected, profile_image_url: avatar });
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
