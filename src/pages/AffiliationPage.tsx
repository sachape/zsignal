import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  ArrowLeft,
  Sparkles,
  Users,
  Clock,
  CalendarDays,
  MessageSquare,
  Heart,
  TrendingUp,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { LoadingState } from "@/components/StateView";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
} from "@/services/reportRepository";
import type { AffiliateProgress } from "@/types/analysis";
import { formatNumber } from "@/lib/format";

interface Criterion {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  current: number;
  target: number;
  available: boolean;
  tip: string;
}

function projectWeeks(current: number, target: number): string | null {
  if (current <= 0) return null;
  if (current >= target) return null;
  const pacePerWeek = current / 4.3;
  const needed = target - current;
  const weeks = Math.ceil(needed / pacePerWeek);
  if (weeks > 52) return "plus d'un an";
  if (weeks === 1) return "~1 semaine";
  return `~${weeks} semaines`;
}

function buildCriteria(ap: AffiliateProgress): Criterion[] {
  return [
    {
      id: "avg_viewers",
      label: "Viewers moyens",
      description: "Moyenne de viewers simultanés sur les 30 derniers jours",
      icon: Users,
      current: ap.avg_viewers.current,
      target: ap.avg_viewers.target,
      available: true,
      tip: "Publie avant chaque live sur tes réseaux et demande à ta communauté de partager. La régularité attire des viewers qui reviennent.",
    },
    {
      id: "stream_days",
      label: "Jours streamés",
      description: "Jours distincts de stream sur les 30 derniers jours",
      icon: CalendarDays,
      current: ap.stream_days.current,
      target: ap.stream_days.target,
      available: true,
      tip: "Vise 2 lives par semaine au minimum. La fréquence est le critère le plus facile à contrôler — c'est juste une question de planning.",
    },
    {
      id: "stream_hours",
      label: "Heures de stream",
      description: "Heures totales streamées sur les 30 derniers jours",
      icon: Clock,
      current: ap.stream_hours.current,
      target: ap.stream_hours.target,
      available: true,
      tip: "Allonge progressivement tes sessions. Passer de 1h à 2h par live double tes heures totales sans doubler ta fréquence.",
    },
    {
      id: "unique_chatters",
      label: "Chatters uniques",
      description: "Personnes distinctes ayant chatté sur les 30 derniers jours",
      icon: MessageSquare,
      current: ap.unique_chatters.current,
      target: ap.unique_chatters.target,
      available: true,
      tip: "Pose des questions directement au chat. Lis les pseudos à voix haute. Plus tu interagis, plus le chat répond.",
    },
    {
      id: "followers",
      label: "Followers",
      description: "Followers totaux sur ta chaîne Twitch",
      icon: Heart,
      current: ap.followers.current ?? 0,
      target: ap.followers.target,
      available: ap.followers.available !== false,
      tip: "Crée du contenu clips et shorts à partir de tes meilleurs moments — c'est le canal d'acquisition organique le plus efficace pour les followers.",
    },
  ];
}

function getColor(pct: number): { bar: string; text: string; border: string; bg: string } {
  if (pct >= 100) return { bar: "bg-primary", text: "text-primary", border: "border-primary/30", bg: "bg-primary/[0.06]" };
  if (pct >= 60)  return { bar: "bg-warning",  text: "text-warning",  border: "border-warning/30",  bg: "bg-warning/[0.06]"  };
  return { bar: "bg-destructive", text: "text-destructive", border: "border-destructive/30", bg: "bg-destructive/[0.06]" };
}

const AffiliationPage = () => {
  const { user } = useAuth();
  const { account, loading: connectionLoading } = useTwitchConnection();
  const [loading, setLoading] = useState(true);
  const [affiliateProgress, setAffiliateProgress] = useState<AffiliateProgress | null>(null);
  const [broadcasterType, setBroadcasterType] = useState<string>("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!user || connectionLoading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const platformUserId = account?.platform_user_id ?? null;
        const report = platformUserId
          ? await getLatestReportForPlatformUser(user.id, platformUserId)
          : await getLatestReport(user.id);

        if (!cancelled && report) {
          setAffiliateProgress(report.report.affiliate_progress);
          setBroadcasterType(report.report.channel_summary.broadcaster_type ?? "");
          setDisplayName(
            account?.platform_display_name ||
              account?.platform_login ||
              report.report.channel_summary.display_name,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, account, connectionLoading]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  const isAffiliate =
    broadcasterType === "affiliate" || broadcasterType === "partner";

  const criteria = affiliateProgress ? buildCriteria(affiliateProgress) : [];
  const completed = criteria.filter(
    (c) => c.available && c.current >= c.target,
  ).length;
  const available = criteria.filter((c) => c.available).length;
  const overallPct = available > 0 ? Math.round((completed / available) * 100) : 0;

  const unlockedTips = criteria.filter(
    (c) => c.available && c.current < c.target,
  );

  return (
    <AppShell>
      <PageContainer>
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Parcours
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Affilié Twitch
              </h1>
              {displayName && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Progression de {displayName}
                </p>
              )}
            </div>
            {isAffiliate && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                {broadcasterType === "partner" ? "Partenaire ✓" : "Affilié ✓"}
              </span>
            )}
          </div>
        </div>

        {/* Already affiliate celebration */}
        {isAffiliate && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/[0.08] blur-3xl" aria-hidden />
            <Sparkles className="mb-3 h-8 w-8 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              {broadcasterType === "partner"
                ? "Tu es Partenaire Twitch !"
                : "Tu es Affilié(e) Twitch !"}
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {broadcasterType === "partner"
                ? "Statut le plus élevé sur Twitch. Concentre-toi maintenant sur la croissance et la monétisation."
                : "Tu peux maintenant activer les abonnements, les Bits et les revenus publicitaires. Prochaine étape : Partenaire."}
            </p>
            <div className="mt-5 flex gap-3">
              <Button asChild size="sm" variant="outline">
                <Link to="/competitors">Voir mes concurrents</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/plan">Mon plan semaine</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Overall progress */}
        {!isAffiliate && affiliateProgress && (
          <div className="mb-6 rounded-2xl border border-white/[0.08] bg-card/40 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Progression vers l'affiliation
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {completed} critère{completed !== 1 ? "s" : ""} atteint{completed !== 1 ? "s" : ""} sur {available}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {overallPct}%
                </span>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Criteria grid */}
        {affiliateProgress && (
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {criteria.map((c) => {
              const pct = !c.available
                ? 0
                : Math.min(100, Math.round((c.current / c.target) * 100));
              const done = c.available && c.current >= c.target;
              const colors = getColor(pct);

              return (
                <div
                  key={c.id}
                  className={`relative overflow-hidden rounded-xl border p-4 ${colors.border} ${colors.bg}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <c.icon className={`h-3.5 w-3.5 ${colors.text}`} />
                        <p className="text-sm font-semibold text-foreground">
                          {c.label}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {c.description}
                      </p>
                    </div>
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground/30" />
                    )}
                  </div>

                  {c.available ? (
                    <>
                      <div className="mb-2 flex items-end justify-between">
                        <span className={`text-xl font-bold tabular-nums ${colors.text}`}>
                          {formatNumber(c.current)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {formatNumber(c.target)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {done ? (
                        <p className="mt-2 text-[10px] font-semibold text-primary">Atteint ✓</p>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3">
                          <p className={`text-[10px] font-semibold tabular-nums ${colors.text}`}>
                            {pct}% — encore {formatNumber(c.target - c.current)}{" "}
                            {c.id === "stream_days" ? "jour(s)" : c.id === "stream_hours" ? "heure(s)" : ""}
                          </p>
                          {(c.id === "stream_days" || c.id === "stream_hours") && (
                            (() => {
                              const proj = projectWeeks(c.current, c.target);
                              return proj ? (
                                <p className="text-[10px] text-muted-foreground/60">
                                  {proj} à ce rythme
                                </p>
                              ) : null;
                            })()
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground/60">
                      Donnée indisponible — reconnecte Twitch pour la débloquer.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tips section */}
        {!isAffiliate && unlockedTips.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Ce que tu peux faire maintenant
            </h2>
            <div className="space-y-2">
              {unlockedTips.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/40 p-4"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/50">
                    <c.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {c.tip}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!affiliateProgress && (
          <div className="rounded-xl border border-border/40 py-12 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">Aucun rapport disponible</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Lance une analyse pour voir ta progression vers l'affiliation.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link to="/dashboard">Tableau de bord</Link>
            </Button>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default AffiliationPage;
