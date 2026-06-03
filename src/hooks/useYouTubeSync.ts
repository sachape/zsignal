import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type SyncState = "idle" | "loading" | "success" | "error" | "expired";

interface SyncResult {
  state: SyncState;
  errorMessage: string | null;
  sync: () => Promise<void>;
}

export function useYouTubeSync(onSuccess?: () => void): SyncResult {
  const [state, setState] = useState<SyncState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sync = useCallback(async () => {
    setState("loading");
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-sync-channel");
      if (error || !data?.success) {
        if (data?.expired) {
          setState("expired");
          setErrorMessage("Token expiré. Reconnecte YouTube.");
        } else {
          setState("error");
          setErrorMessage(data?.error ?? error?.message ?? "Erreur de synchronisation.");
        }
        return;
      }
      setState("success");
      onSuccess?.();
    } catch (e) {
      setState("error");
      setErrorMessage("Erreur réseau. Réessaie.");
    }
  }, [onSuccess]);

  return { state, errorMessage, sync };
}
