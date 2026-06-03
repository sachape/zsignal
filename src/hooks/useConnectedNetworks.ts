import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ConnectedAccount, Platform, ConnectionStatus } from "@/types/networks";

interface UpsertPayload {
  platform: Platform;
  username?: string | null;
  display_name?: string | null;
  profile_url?: string | null;
  avatar_url?: string | null;
  connection_status?: ConnectionStatus;
}

interface UseConnectedNetworksReturn {
  accounts: ConnectedAccount[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  upsertAccount: (data: UpsertPayload) => Promise<void>;
  removeAccount: (platform: Platform) => Promise<void>;
}

export function useConnectedNetworks(): UseConnectedNetworksReturn {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from("creator_connected_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      setAccounts((data as ConnectedAccount[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const upsertAccount = useCallback(
    async (data: UpsertPayload) => {
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any)
        .from("creator_connected_accounts")
        .upsert(
          { ...data, user_id: user.id },
          { onConflict: "user_id,platform" },
        );
      if (err) throw new Error(err.message);
      await fetch();
    },
    [user, fetch],
  );

  const removeAccount = useCallback(
    async (platform: Platform) => {
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any)
        .from("creator_connected_accounts")
        .delete()
        .eq("user_id", user.id)
        .eq("platform", platform);
      if (err) throw new Error(err.message);
      await fetch();
    },
    [user, fetch],
  );

  return { accounts, loading, error, refetch: fetch, upsertAccount, removeAccount };
}
