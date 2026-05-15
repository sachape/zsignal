import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

const UnsubscribePage = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    const url = `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: SUPABASE_ANON_KEY } })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.valid) setState({ kind: "ready" });
        else if (data.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid" });
      })
      .catch(() => setState({ kind: "invalid" }));
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success || data.reason === "already_unsubscribed")) {
        setState({ kind: "done" });
      } else {
        setState({ kind: "error", message: "Désinscription impossible. Réessaie plus tard." });
      }
    } catch {
      setState({ kind: "error", message: "Erreur réseau. Réessaie plus tard." });
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Désinscription</h1>

        {state.kind === "loading" && (
          <p className="mt-4 text-muted-foreground">Vérification du lien…</p>
        )}

        {state.kind === "ready" && (
          <>
            <p className="mt-4 text-muted-foreground">
              Tu es sur le point de te désinscrire des emails Streamnco. Tu ne recevras plus
              d'emails à cette adresse.
            </p>
            <Button onClick={confirm} className="mt-6 w-full">
              Confirmer la désinscription
            </Button>
          </>
        )}

        {state.kind === "submitting" && (
          <p className="mt-4 text-muted-foreground">Désinscription en cours…</p>
        )}

        {state.kind === "done" && (
          <p className="mt-4 text-foreground">
            C'est fait. Tu ne recevras plus d'emails de notre part.
          </p>
        )}

        {state.kind === "already" && (
          <p className="mt-4 text-muted-foreground">
            Cette adresse est déjà désinscrite — aucune action supplémentaire n'est nécessaire.
          </p>
        )}

        {state.kind === "invalid" && (
          <p className="mt-4 text-muted-foreground">
            Lien invalide ou expiré. Si tu reçois encore des emails, contacte-nous.
          </p>
        )}

        {state.kind === "error" && (
          <p className="mt-4 text-destructive">{state.message}</p>
        )}
      </section>
    </main>
  );
};

export default UnsubscribePage;
