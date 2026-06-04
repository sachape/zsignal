import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MetaConnectionStatus =
  | "connected"
  | "expired"
  | "revoked"
  | "pending_review"
  | "error"
  | "disconnected";

export interface MetaConnection {
  id: string;
  platform: string;
  connection_status: MetaConnectionStatus;
  instagram_account_id: string | null;
  instagram_username: string | null;
  instagram_profile_picture_url: string | null;
  account_type: string | null;
  page_id: string | null;
  page_name: string | null;
  scopes_granted: string[] | null;
  token_expires_at: string | null;
  last_sync_at: string | null;
  error_code: string | null;
  error_message: string | null;
  updated_at: string;
}

/**
 * Reads the (frontend-safe) Instagram/Meta connection row.
 * Tokens are NEVER selected — they live in *_encrypted columns
 * and are read server-side only by edge functions.
 */
export function useInstagramConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from("creator_meta_connections")
      .select(
        "id, platform, connection_status, instagram_account_id, instagram_username, instagram_profile_picture_url, account_type, page_id, page_name, scopes_granted, token_expires_at, last_sync_at, error_code, error_message, updated_at",
      )
      .eq("user_id", user.id)
      .eq("platform", "instagram")
      .maybeSingle();

    if (err) setError(err.message);
    else setConnection((data as MetaConnection) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return { connection, loading, error, refetch: fetchConnection };
}
