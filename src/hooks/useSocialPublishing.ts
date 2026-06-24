import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PublishingPlatform = "youtube" | "tiktok" | "instagram";

export interface PublishingAccount {
  id: string; // zernio account id (_id)
  platform: PublishingPlatform;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  status: "connected" | "error" | "disconnected";
}

interface RawZernioAccount {
  _id: string;
  platform: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  status?: string;
}

export function useSocialPublishing() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PublishingAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke<{ accounts: RawZernioAccount[] }>(
        "zernio-list-accounts",
        { body: {} },
      );
      if (err) throw err;
      const list = (data?.accounts ?? [])
        .map((a) => {
          const platform = (a.platform ?? "").toLowerCase() as PublishingPlatform;
          if (!["youtube", "tiktok", "instagram"].includes(platform)) return null;
          return {
            id: a._id,
            platform,
            username: a.username ?? null,
            displayName: a.displayName ?? a.username ?? null,
            avatarUrl: a.avatarUrl ?? null,
            status: a.status === "error" ? "error" : "connected",
          } as PublishingAccount;
        })
        .filter((x): x is PublishingAccount => x !== null);
      setAccounts(list);
    } catch (e) {
      setError((e as Error).message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const connect = useCallback(async (platform: PublishingPlatform) => {
    const redirectUrl = `${window.location.origin}/reseaux/callback`;
    const { data, error: err } = await supabase.functions.invoke<{ authUrl: string }>(
      "zernio-connect-account",
      { body: { platform, redirect_url: redirectUrl } },
    );
    if (err) throw err;
    if (!data?.authUrl) throw new Error("URL de connexion indisponible.");
    window.location.href = data.authUrl;
  }, []);

  return { accounts, loading, error, refresh, connect };
}
