import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * /auth/youtube/callback
 *
 * Google redirige ici après le consentement OAuth. La page :
 *   1. lit code, state, error depuis l'URL
 *   2. si error : redirige vers /reseaux?youtube=error
 *   3. sinon : POST { code, state } vers l'edge function youtube-auth-callback
 *   4. redirige vers /reseaux?youtube=connected (succès) ou ?youtube=error (échec)
 *
 * Aucun token Google n'est manipulé côté client : l'échange code → tokens
 * et le chiffrement se font exclusivement côté Edge Function.
 */
const YouTubeCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Connexion à YouTube en cours…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code  = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      const reason = error === "access_denied" ? "cancelled" : "error";
      navigate(`/reseaux?youtube=${reason}`, { replace: true });
      return;
    }

    if (!code || !state) {
      navigate("/reseaux?youtube=error&reason=missing_params", { replace: true });
      return;
    }

    (async () => {
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke(
          "youtube-auth-callback",
          { body: { code, state } },
        );

        if (invokeErr || !data?.success) {
          const reason = (data as { reason?: string } | null)?.reason ?? "callback_failed";
          setMessage("Échec de la connexion. Redirection…");
          navigate(`/reseaux?youtube=error&reason=${encodeURIComponent(reason)}`, { replace: true });
          return;
        }

        setMessage("Connecté. Redirection…");
        navigate("/reseaux?youtube=connected", { replace: true });
      } catch (e) {
        console.error("youtube callback", e);
        navigate("/reseaux?youtube=error&reason=internal", { replace: true });
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

export default YouTubeCallbackPage;
