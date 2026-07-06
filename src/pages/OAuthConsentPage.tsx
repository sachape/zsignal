import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

// Beta API — narrow typed wrapper around supabase.auth.oauth.*
type OAuthAuthzDetails = {
  client?: { name?: string; logo_uri?: string; client_uri?: string } | null;
  scopes?: string[] | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthResult = { data: OAuthAuthzDetails | null; error: { message: string } | null };

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};

const getOAuthApi = (): OAuthApi | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (supabase.auth as any)?.oauth;
  return api ?? null;
};

const OAuthConsentPage = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthAuthzDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Requête d'autorisation invalide (authorization_id manquant).");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Preserve the full consent URL so auth returns the user here.
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?redirect=" + encodeURIComponent(next);
        return;
      }
      const api = getOAuthApi();
      if (!api) {
        setError("La configuration OAuth n'est pas disponible.");
        return;
      }
      const { data, error } = await api.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    const api = getOAuthApi();
    if (!api) {
      setBusy(false);
      setError("La configuration OAuth n'est pas disponible.");
      return;
    }
    const { data, error } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Le serveur d'autorisation n'a pas renvoyé de redirection.");
      return;
    }
    window.location.href = target;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-primary-strong">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-medium">Autorisation d'accès</span>
            </div>

            {error && (
              <p className="text-sm text-destructive">Erreur : {error}</p>
            )}

            {!error && !details && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement de la demande…
              </div>
            )}

            {details && (
              <>
                <div className="space-y-2">
                  <h1 className="text-lg font-semibold text-foreground">
                    Connecter {details.client?.name ?? "cette application"} à ton compte
                    Streamnco
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {details.client?.name ?? "L'application"} pourra utiliser
                    Streamnco en ton nom via l'API MCP pour lire tes rapports
                    d'analyse.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => decide(false)}
                    className="flex-1"
                  >
                    Refuser
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => decide(true)}
                    className="flex-1"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Autoriser"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OAuthConsentPage;
