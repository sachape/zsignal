import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Check, Loader2, PlusCircle, RefreshCcw, Sparkles, Tv2, Unplug } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection, switchActiveAccount, type TwitchAccount } from "@/hooks/useTwitchConnection";
import { usePlan } from "@/hooks/usePlan";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AccountMeta {
  lastAnalysisAt: string | null;
  lastLiveAt: string | null;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

const TwitchAccountsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { accounts, account, initializing } = useTwitchConnection();
  const { plan, isGrowth, loading: planLoading } = usePlan();
  const [meta, setMeta] = useState<Record<string, AccountMeta>>({});
  const [pendingDisconnect, setPendingDisconnect] = useState<TwitchAccount | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  usePageMeta({
    title: "Comptes Twitch — Streamnco",
    description: "Gère les chaînes Twitch connectées à Streamnco.",
  });

  const maxAccounts = planLoading ? 1 : isGrowth ? 3 : 1;
  const count = accounts.length;
  const atLimit = count >= maxAccounts;

  // Load last analysis + last live per account (best-effort)
  useEffect(() => {
    if (!user || accounts.length === 0) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, AccountMeta> = {};
      await Promise.all(
        accounts.map(async (acc) => {
          const login = acc.platform_login;
          const pid = acc.platform_user_id;
          if (!login) {
            out[acc.id] = { lastAnalysisAt: null, lastLiveAt: null };
            return;
          }
          const [jobRes, liveRes] = await Promise.all([
            supabase
              .from("analysis_jobs")
              .select("created_at")
              .eq("user_id", user.id)
              .eq("platform_login", login)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            pid
              ? supabase
                  .from("live_sessions")
                  .select("started_at")
                  .eq("user_id", user.id)
                  .eq("platform_user_id", pid)
                  .order("started_at", { ascending: false })
                  .limit(1)
                  .maybeSingle()
              : Promise.resolve({ data: null } as { data: { started_at: string } | null }),
          ]);
          out[acc.id] = {
            lastAnalysisAt: jobRes.data?.created_at ?? null,
            lastLiveAt: (liveRes.data as { started_at?: string } | null)?.started_at ?? null,
          };
        }),
      );
      if (!cancelled) setMeta(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, accounts]);

  const handleSetActive = (acc: TwitchAccount) => {
    if (!user || !acc.platform_login) return;
    switchActiveAccount(user.id, acc.platform_login, acc.id);
  };

  const handleAnalyze = (acc: TwitchAccount) => {
    if (!user || !acc.platform_login) return;
    switchActiveAccount(user.id, acc.platform_login, acc.id);
    navigate("/analyse");
  };

  const handleAdd = () => {
    if (!isGrowth && count >= 1) {
      navigate("/billing");
      return;
    }
    if (atLimit) return;
    navigate("/connect-twitch?mode=add");
  };

  const handleConfirmDisconnect = async () => {
    if (!pendingDisconnect || !user) return;
    const acc = pendingDisconnect;
    setDisconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("twitch-disconnect", {
        body: { connected_account_id: acc.id },
      });
      if (error) throw error;
      if (data && (data as { error?: string }).error) {
        throw new Error((data as { message?: string; error: string }).message ?? (data as { error: string }).error);
      }
      toast.success(`Chaîne @${acc.platform_login ?? ""} déconnectée.`);
      setPendingDisconnect(null);
      // Refresh accounts list
      window.location.reload();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? `Échec de la déconnexion : ${e.message}`
          : "Échec de la déconnexion.",
      );
    } finally {
      setDisconnecting(false);
    }
  };

  const planLabel =
    plan === "growth" || plan === "agency"
      ? "Growth"
      : plan === "pro"
      ? "Pro"
      : "Gratuit";

  return (
    <AppShell>
      <PageContainer size="sm">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/settings" className="hover:text-foreground">Mon compte</Link>
            <span>/</span>
            <span className="text-foreground">Comptes Twitch</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[28px]">
            Comptes Twitch
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Gère les chaînes Twitch connectées à Streamnco.
          </p>
        </div>

        {/* Plan + usage */}
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Plan actuel
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-xs">
                  Plan {planLabel}
                </span>
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Utilisation
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {count}/{maxAccounts} {maxAccounts > 1 ? "chaînes connectées" : "chaîne connectée"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Accounts list */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Chaînes connectées
          </h2>

          {initializing ? (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                Chargement…
              </CardContent>
            </Card>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Tv2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Aucune chaîne Twitch connectée
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Connecte ta première chaîne pour démarrer.
                    </p>
                  </div>
                </div>
                <Button asChild size="sm">
                  <Link to="/connect-twitch">Connecter Twitch</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => {
                const isActive = account?.id === acc.id;
                const login = acc.platform_login ?? "";
                const display = acc.platform_display_name || login;
                const m = meta[acc.id];
                const lastAnalysis = formatDate(m?.lastAnalysisAt ?? null);
                const lastLive = formatDate(m?.lastLiveAt ?? null);
                return (
                  <Card key={acc.id} className={isActive ? "border-primary/40" : undefined}>
                    <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-11 w-11 shrink-0 rounded-full border border-border/60">
                          {acc.profile_image_url && (
                            <AvatarImage src={acc.profile_image_url} alt={login} className="object-cover" />
                          )}
                          <AvatarFallback className="rounded-full bg-muted text-xs font-semibold">
                            {login.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {display}
                            </p>
                            {isActive && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                <Check className="h-3 w-3" /> Active
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">@{login}</p>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80">
                            <span>
                              Dernière analyse : <span className="text-foreground/90">{lastAnalysis ?? "—"}</span>
                            </span>
                            <span>
                              Dernier live : <span className="text-foreground/90">{lastLive ?? "—"}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 md:shrink-0">
                        {!isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => handleSetActive(acc)}
                          >
                            Définir comme actif
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => handleAnalyze(acc)}
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          Analyser cette chaîne
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDisconnect(acc)}
                        >
                          <Unplug className="h-3.5 w-3.5" />
                          Déconnecter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

          )}
        </section>

        {/* Add account */}
        <section>
          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <PlusCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {isGrowth ? "Ajouter une chaîne Twitch" : "Connecter une autre chaîne"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isGrowth && atLimit
                      ? "Limite Growth atteinte : 3/3."
                      : !isGrowth && count >= 1
                      ? "Passe à Growth pour connecter jusqu'à 3 chaînes Twitch."
                      : "Connecte une nouvelle chaîne en quelques secondes."}
                  </p>
                </div>
              </div>
              {isGrowth ? (
                <Button size="sm" disabled={atLimit} onClick={handleAdd}>
                  {atLimit ? "3/3" : "Ajouter une chaîne"}
                </Button>
              ) : count >= 1 ? (
                <Button size="sm" className="gap-1.5" onClick={() => navigate("/billing")}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Passer à Growth
                </Button>
              ) : (
                <Button size="sm" onClick={handleAdd}>
                  Connecter Twitch
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      </PageContainer>
    </AppShell>
  );
};

export default TwitchAccountsPage;
