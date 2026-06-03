import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * /auth/tiktok/callback
 *
 * TikTok redirige ici après le consentement OAuth. La page :
 *   1. lit code, state, error depuis l'URL
 *   2. si error : redirige vers /reseaux?tiktok=cancelled|error
 *   3. sinon : POST { code, state } vers l'edge function tiktok-auth-callback
 *   4. redirige vers /reseaux?tiktok=connected (succès) ou ?tiktok=error
 *
 * Aucun token TikTok n'est manipulé côté client : l'échange code → tokens
 * et le chiffrement se font exclusivement côté Edge Function.
 */
const TikTokCallbackPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Connexion à TikTok en cours…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code  = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      const reason = error === "access_denied" ? "cancelled" : "error";
      navigate(`/reseaux?tiktok=${reason}`, { replace: true });
      return;
    }

    if (!code || !state) {
      navigate("/reseaux?tiktok=error&reason=missing_params", { replace: true });
      return;
    }

    (async () => {
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke(
          "tiktok-auth-callback",
          { body: { code, state } },
        );

        if (invokeErr || !data?.success) {
          const reason = (data as { reason?: string } | null)?.reason ?? "callback_failed";
          setMessage("Échec de la connexion. Redirection…");
          navigate(`/reseaux?tiktok=error&reason=${encodeURIComponent(reason)}`, { replace: true });
          return;
        }

        setMessage("Connecté. Redirection…");
        navigate("/reseaux?tiktok=connected", { replace: true });
      } catch (e) {
        console.error("tiktok callback", e);
        navigate("/reseaux?tiktok=error&reason=internal", { replace: true });
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

export default TikTokCallbackPage;
