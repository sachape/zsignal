import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TwitchAccount {
  id: string;
  platform_login: string | null;
  platform_display_name: string | null;
  platform_user_id: string | null;
  created_at: string;
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

    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("connected_accounts")
        .select("id, platform_login, platform_display_name, platform_user_id, created_at")
        .eq("user_id", user.id)
        .eq("platform", "twitch")
        .maybeSingle();

      setAccount(data);
      setLoading(false);
    };

    fetch();
  }, [user]);

  return {
    isConnected: !!account,
    account,
    loading,
  };
}
