import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type InstagramCallbackResponse = {
  success?: boolean;
  error?: string;
  error_code?: string;
  error_step?: string;
  http_status?: number;
  meta_error_type?: string;
  meta_error_message?: string;
  message?: string;
  callback_version?: string;
};

const readInvokeErrorBody = async (error: unknown): Promise<InstagramCallbackResponse | null> => {
  const context = typeof error === "object" && error !== null && "context" in error
    ? (error as { context?: unknown }).context
    : null;
  if (!(context instanceof Response)) return null;
  try {
    return (await context.clone().json()) as InstagramCallbackResponse;
  } catch {
    return null;
  }
};

const buildInstagramErrorUrl = (payload: InstagramCallbackResponse) => {
  const query = new URLSearchParams({ instagram: "error" });
  query.set("reason", payload.error_code ?? payload.error ?? "callback_failed");
  if (payload.error_step) query.set("step", payload.error_step);
  if (payload.meta_error_message) query.set("meta_error", payload.meta_error_message);
  if (payload.callback_version) query.set("callback_version", payload.callback_version);
  return `/reseaux?${query.toString()}`;
};

/**
 * /auth/instagram/callback
 *
 * Instagram redirects here after Instagram Login consent (direct Instagram OAuth,
 * no Facebook Page required). The page:
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
        const payload = ((data as InstagramCallbackResponse | null) ?? await readInvokeErrorBody(invokeErr)) ?? {};
        if (payload.callback_version) {
          console.debug("instagram callback version", payload.callback_version);
        }

        if (invokeErr || !payload.success) {
          setMessage("Échec de la connexion. Redirection…");
          navigate(buildInstagramErrorUrl(payload), { replace: true });
          return;
        }

        setMessage("Connecté. Redirection…");
        navigate("/reseaux?instagram=connected", { replace: true });
      } catch {
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
