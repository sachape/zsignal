import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InstagramOAuthStatus {
  oauth_enabled: boolean;
  publish_enabled: boolean;
  configured: boolean;
}

/**
 * Fetches the backend-driven Instagram OAuth availability.
 * Avoids relying on a VITE_ build-time flag (not supported in Lovable Secrets).
 * Returns booleans only — never touches tokens or secrets.
 */
export function useInstagramOAuthStatus() {
  const [status, setStatus] = useState<InstagramOAuthStatus>({
    oauth_enabled: false,
    publish_enabled: false,
    configured: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("instagram-oauth-status");
        if (!cancelled && !error && data) setStatus(data as InstagramOAuthStatus);
      } catch {
        /* keep defaults (disabled) */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { ...status, loading };
}
