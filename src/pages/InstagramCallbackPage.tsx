import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * /auth/instagram/callback
 *
 * Meta redirects here after Facebook Login consent. The page:
 *   1. reads code/state/error from the URL
 *   2. POSTs { code, state } to the edge function instagram-auth-callback
 *   3. redirects to /reseaux?instagram=connected|error|cancelled
 *
 * No token is ever handled client-side.
 */
const InstagramCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Connexion à Instagram en cours…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorReason = params.get("error_reason");

    if (error) {
      const reason = error === "access_denied" || errorReason === "user_denied" ? "cancelled" : "error";
      navigate(`/reseaux?instagram=${reason}&reason=${encodeURIComponent(errorReason ?? error)}`, { replace: true });
      return;
    }

    if (!code || !state) {
      navigate("/reseaux?instagram=error&reason=missing_params", { replace: true });
      return;
    }

    (async () => {
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke(
          "instagram-auth-callback",
          { body: { code, state } },
        );

        if (invokeErr || !(data as { success?: boolean } | null)?.success) {
          const reason = (data as { error?: string } | null)?.error ?? "callback_failed";
          setMessage("Échec de la connexion. Redirection…");
          navigate(`/reseaux?instagram=error&reason=${encodeURIComponent(reason)}`, { replace: true });
          return;
        }

        setMessage("Connecté. Redirection…");
        navigate("/reseaux?instagram=connected", { replace: true });
      } catch (e) {
        console.error("instagram callback", e);
        navigate("/reseaux?instagram=error&reason=internal", { replace: true });
      }
    })();
  }, [params, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default InstagramCallbackPage;
