import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  Sparkles,
  Users,
  Clock,
  CalendarDays,
  MessageSquare,
  Heart,
  TrendingUp,
  Lock,
  ChevronRight,
  Star,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { LoadingState } from "@/components/StateView";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { usePlan } from "@/hooks/usePlan";
import { InlineLock } from "@/components/PaywallGate";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
} from "@/services/reportRepository";
import type { AffiliateProgress } from "@/types/analysis";
import { formatNumber } from "@/lib/format";
import { usePageMeta } from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";

// ── Tier definitions ──────────────────────────────────────────────────────────

interface TierDef {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  unlocks: string[];
  targets: {
    avg_viewers: number;
    stream_days: number;
    stream_hours: number;
    unique_chatters: number;
    followers: number;
  };
  tips: Record<string, string>;
}

const TIERS: TierDef[] = [
  {
    id: "affiliate",
    label: "Affilié Twitch",
    shortLabel: "Affilié",
    description: "Le premier palier de monétisation Twitch.",
    unlocks: [
      "Abonnements payants",
      "Revenus publicitaires",
      "Émotes personnalisées",
      "Bits",
    ],
    targets: { avg_viewers: 3, stream_days: 7, stream_hours: 8, unique_chatters: 3, followers: 50 },
    tips: {
      avg_viewers: "Publie avant chaque live sur tes réseaux. La régularité attire des viewers qui reviennent.",
      stream_days: "Vise 2 lives par semaine minimum. La fréquence est le critère le plus facile à contrôler.",
      stream_hours: "Allonge progressivement tes sessions. Passer de 1h à 2h double tes heures sans doubler ta fréquence.",
      unique_chatters: "Pose des questions au chat. Lis les pseudos à voix haute. Plus tu interagis, plus le chat répond.",
      followers: "Crée des clips de tes meilleurs moments et partage-les sur TikTok ou Twitter.",
    },
  },
  {
    id: "established",
    label: "Streamer Établi",
    shortLabel: "Établi",
    description: "Consolide ton audience et construis une communauté fidèle.",
    unlocks: [
      "Audience régulière de 10+ viewers",
      "Revenus d'abonnements stables",
      "Communauté Discord active",
      "Contenu clips monétisable",
    ],
    targets: { avg_viewers: 10, stream_days: 12, stream_hours: 20, unique_chatters: 20, followers: 200 },
    tips: {
      avg_viewers: "Fixe un planning hebdomadaire strict. Les viewers reviennent quand ils savent quand tu streames.",
      stream_days: "Vise 3 streams par semaine. La régularité à ce stade crée des habitudes chez tes viewers.",
      stream_hours: "Allonge tes sessions à 2h30-3h pour maximiser les hours streamées sans pression.",
      unique_chatters: "Lance un Discord minimal (3 salons suffisent) pour fidéliser ta communauté hors stream.",
      followers: "Recycle tes clips en Shorts et Reels. Un bon clip peut rapporter 500-2000 followers organiques.",
    },
  },
  {
    id: "growth",
    label: "Phase de Croissance",
    shortLabel: "Croissance",
    description: "Accélère ta croissance et prépare le terrain pour le partenariat.",
    unlocks: [
      "30+ viewers fidèles",
      "Revenus pub et subs significatifs",
      "Visibilité dans ta niche",
      "Collaborations possibles",
    ],
    targets: { avg_viewers: 30, stream_days: 15, stream_hours: 35, unique_chatters: 50, followers: 750 },
    tips: {
      avg_viewers: "Fais des collabs et des raids réguliers. L'exposition croisée est le levier de croissance le plus puissant.",
      stream_days: "Vise 4 streams par semaine. À ce stade, la cohérence est ce qui sépare les chaînes qui stagnent de celles qui explosent.",
      stream_hours: "40h/mois correspond à ce que Twitch attend pour le partenariat. Commence à t'en rapprocher.",
      unique_chatters: "Organise des événements : tournois, challenges, soirées Q&A. Ça crée des pics de chatters uniques.",
      followers: "Investis dans une présence Twitter/X cohérente avec ta chaîne Twitch.",
    },
  },
  {
    id: "partner",
    label: "Partenaire Twitch",
    shortLabel: "Partenaire",
    description: "Le statut le plus élevé sur Twitch, avec revenus premium.",
    unlocks: [
      "Badge Partenaire officiel",
      "Revenus publicitaires premium",
      "Support Twitch prioritaire",
      "Transcodes vidéo garantis",
    ],
    targets: { avg_viewers: 75, stream_days: 12, stream_hours: 25, unique_chatters: 150, followers: 2000 },
    tips: {
      avg_viewers: "À 75 viewers moyens, Twitch attend une demande de partenariat. Documente ta progression.",
      stream_days: "12 jours de stream uniques par mois est un critère officiel Twitch pour le partenariat.",
      stream_hours: "25h/mois est le seuil minimum Twitch. L'objectif est de le dépasser confortablement.",
      unique_chatters: "Une communauté très active de chatters est un signal fort que Twitch regarde pour le partenariat.",
      followers: "2000 followers est un seuil observé parmi les chaînes partenaires, même si non officiel.",
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

interface RawProgress {
  avg_viewers: number;
  stream_days: number;
  stream_hours: number;
  unique_chatters: number;
  followers: number;
  followers_available: boolean;
}

function extractProgress(ap: AffiliateProgress): RawProgress {
  return {
    avg_viewers: ap.avg_viewers.current,
    stream_days: ap.stream_days.current,
    stream_hours: ap.stream_hours.current,
    unique_chatters: ap.unique_chatters.current,
    followers: ap.followers.current ?? 0,
    followers_available: ap.followers.available !== false,
  };
}

function isTierComplete(progress: RawProgress, tier: TierDef): boolean {
  return (
    progress.avg_viewers >= tier.targets.avg_viewers &&
    progress.stream_days >= tier.targets.stream_days &&
    progress.stream_hours >= tier.targets.stream_hours &&
    progress.unique_chatters >= tier.targets.unique_chatters &&
    (!progress.followers_available || progress.followers >= tier.targets.followers)
  );
}

function getActiveTierIndex(broadcasterType: string, progress: RawProgress | null): number {
  if (!progress) return 0;
  const isAffiliate = broadcasterType === "affiliate" || broadcasterType === "partner";
  const isPartner = broadcasterType === "partner";

  if (isPartner) return 3;
  if (!isAffiliate) return 0;

  // Affiliate: find the first non-complete tier from tier 1 onward
  if (isTierComplete(progress, TIERS[1])) {
    if (isTierComplete(progress, TIERS[2])) return 3;
    return 2;
  }
  return 1;
}

function getColor(pct: number) {
  if (pct >= 100) return { bar: "bg-primary", text: "text-primary-strong", border: "border-primary/30", bg: "bg-primary/[0.05]" };
  if (pct >= 60)  return { bar: "bg-warning",  text: "text-warning",  border: "border-warning/30",  bg: "bg-warning/[0.05]"  };
  return { bar: "bg-destructive", text: "text-destructive", border: "border-destructive/30", bg: "bg-destructive/[0.05]" };
}

function projectWeeks(current: number, target: number): string | null {
  if (current <= 0 || current >= target) return null;
  const weeks = Math.ceil((target - current) / (current / 4.3));
  if (weeks > 52) return "plus d'un an";
  return weeks === 1 ? "~1 sem." : `~${weeks} sem.`;
}

// ── Milestone stepper ─────────────────────────────────────────────────────────

function MilestoneStepper({ activeTierIndex, completedUpTo }: {
  activeTierIndex: number;
  completedUpTo: number;
}) {
  return (
    <div className="mb-8 flex items-start">
      {TIERS.map((tier, i) => {
        const isCompleted = i < completedUpTo;
        const isActive = i === activeTierIndex;
        const isLocked = i > activeTierIndex;

        return (
          <div key={tier.id} className="flex flex-1 items-start">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_0_12px_-2px] shadow-primary/40"
                    : isActive
                      ? "border-primary bg-primary/10 text-primary-strong"
                      : "border-border/30 bg-muted/20 text-muted-foreground/40",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isLocked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-center text-[12px] font-semibold leading-tight",
                  isCompleted || isActive ? "text-foreground" : "text-muted-foreground/40",
                )}
              >
                {tier.shortLabel}
              </span>
            </div>
            {i < TIERS.length - 1 && (
              <div
                className={cn(
                  "mx-2 mt-3.5 h-0.5 flex-1 rounded-full transition-colors",
                  i < completedUpTo ? "bg-primary" : "bg-border/30",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Criteria grid ─────────────────────────────────────────────────────────────

const CRITERION_META = [
  { id: "avg_viewers",    icon: Users,         label: "Viewers moyens",  desc: "Moyenne simultanée sur 30 jours", unit: "" },
  { id: "stream_days",    icon: CalendarDays,  label: "Jours streamés",  desc: "Jours distincts sur 30 jours",    unit: "j" },
  { id: "stream_hours",   icon: Clock,         label: "Heures de stream", desc: "Heures totales sur 30 jours",    unit: "h" },
  { id: "unique_chatters",icon: MessageSquare, label: "Chatters uniques", desc: "Personnes distinctes sur 30 j",  unit: "" },
  { id: "followers",      icon: Heart,         label: "Followers",       desc: "Followers totaux Twitch",         unit: "" },
] as const;

function CriteriaGrid({ progress, tier }: { progress: RawProgress; tier: TierDef }) {
  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CRITERION_META.map((meta) => {
        const isFollowers = meta.id === "followers";
        if (isFollowers && !progress.followers_available) {
          return (
            <div key={meta.id} className="relative rounded-xl border border-border/30 bg-muted/10 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <meta.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-sm font-semibold text-muted-foreground/60">{meta.label}</p>
              </div>
              <p className="text-xs text-muted-foreground/50">
                Donnée indisponible — reconnecte Twitch.
              </p>
            </div>
          );
        }

        const current = progress[meta.id as keyof Omit<RawProgress, "followers_available">] as number;
        const target = tier.targets[meta.id as keyof typeof tier.targets];
        const pct = Math.min(100, Math.round((current / target) * 100));
        const done = current >= target;
        const colors = getColor(pct);

        return (
          <div
            key={meta.id}
            className={cn(
              "relative overflow-hidden rounded-xl border p-4 transition-colors",
              colors.border,
              colors.bg,
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <meta.icon className={cn("h-3.5 w-3.5", colors.text)} />
                  <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{meta.desc}</p>
              </div>
              {done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary-strong" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground/20" />
              )}
            </div>

            <div className="mb-2 flex items-end justify-between">
              <span className={cn("text-xl font-bold tabular-nums", colors.text)}>
                {formatNumber(current)}
              </span>
              <span className="text-xs text-muted-foreground">/ {formatNumber(target)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn("h-full rounded-full transition-all duration-700", colors.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>

            {done ? (
              <p className="mt-2 text-[12px] font-semibold text-primary-strong">Atteint ✓</p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-x-3">
                <p className={cn("text-[12px] font-semibold tabular-nums", colors.text)}>
                  {pct}% — encore {formatNumber(target - current)}{meta.unit ? ` ${meta.unit}` : ""}
                </p>
                {(meta.id === "stream_days" || meta.id === "stream_hours") && (() => {
                  const proj = projectWeeks(current, target);
                  return proj ? (
                    <p className="text-[12px] text-muted-foreground/60">{proj} à ce rythme</p>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const AffiliationPage = () => {
  const { user } = useAuth();
  const { account, loading: connectionLoading } = useTwitchConnection();
  const { isPro } = usePlan();
  const [loading, setLoading] = useState(true);
  const [affiliateProgress, setAffiliateProgress] = useState<AffiliateProgress | null>(null);
  const [broadcasterType, setBroadcasterType] = useState<string>("");
  const [displayName, setDisplayName] = useState("");

  usePageMeta({
    title: "Progression",
    description: "Suis ta progression vers l'affiliation et au-delà.",
  });

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

  if (loading) return <AppShell><LoadingState /></AppShell>;

  const progress = affiliateProgress ? extractProgress(affiliateProgress) : null;
  const isAffiliate = broadcasterType === "affiliate" || broadcasterType === "partner";
  const isPartner = broadcasterType === "partner";

  // Determine which tier index is currently active (= next goal)
  const activeTierIndex = getActiveTierIndex(broadcasterType, progress);

  // How many tiers are fully completed (determines stepper colors)
  const completedUpTo = isPartner ? 4 : isAffiliate ? 1 : 0;

  const activeTier = TIERS[activeTierIndex];
  const nextTier = activeTierIndex < TIERS.length - 1 ? TIERS[activeTierIndex + 1] : null;

  // Per-criteria completion for the active tier
  const criteriaStatus = progress
    ? CRITERION_META.map((meta) => {
        const isFollowers = meta.id === "followers";
        if (isFollowers && !progress.followers_available) return { ...meta, done: false, skipped: true };
        const current = progress[meta.id as keyof Omit<RawProgress, "followers_available">] as number;
        const target = activeTier.targets[meta.id as keyof typeof activeTier.targets];
        return { ...meta, done: current >= target, skipped: false };
      })
    : [];

  const available = criteriaStatus.filter((c) => !c.skipped).length;
  const completed = criteriaStatus.filter((c) => c.done).length;
  const overallPct = available > 0 ? Math.round((completed / available) * 100) : 0;

  const unlockedTips = criteriaStatus.filter((c) => !c.done && !c.skipped);

  return (
    <AppShell>
      <PageContainer>
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-[28px]">
              {isPartner ? "Partenaire Twitch ✓" : isAffiliate ? "Affilié Twitch ✓" : "Progression"}
            </h1>
            {displayName && (
              <p className="mt-1 text-sm text-muted-foreground">Progression de {displayName}</p>
            )}
          </div>
          {(isAffiliate || isPartner) && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary-strong">
              <Sparkles className="h-4 w-4" />
              {isPartner ? "Partenaire" : "Affilié"} ✓
            </span>
          )}
        </div>

        {/* Milestone stepper */}
        <MilestoneStepper
          activeTierIndex={activeTierIndex}
          completedUpTo={completedUpTo}
        />

        {/* No data */}
        {!affiliateProgress && (
          <div className="rounded-xl border border-border/40 py-12 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">Aucun rapport disponible</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Lance une analyse pour voir ta progression.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link to="/dashboard">Tableau de bord</Link>
            </Button>
          </div>
        )}

        {/* Partner — max tier reached */}
        {isPartner && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.04] p-7">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/[0.08] blur-3xl" aria-hidden />
            <Star className="mb-3 h-8 w-8 text-primary-strong" />
            <h2 className="text-xl font-bold text-foreground">Tu es Partenaire Twitch !</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Statut le plus élevé sur Twitch. Concentre-toi maintenant sur la croissance durable, la monétisation et la fidélisation de ta communauté.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="sm" variant="outline"><Link to="/competitors">Voir mes concurrents</Link></Button>
              <Button asChild size="sm"><Link to="/plan">Mon plan semaine</Link></Button>
            </div>
          </div>
        )}

        {/* Active tier: objective card */}
        {progress && !isPartner && (
          <>
            {/* Next goal card */}
            <div className="mb-6 rounded-2xl border border-white/[0.08] bg-card/40 p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {isAffiliate ? "Prochain palier" : "Objectif actuel"}
                  </p>
                  <p className="mt-0.5 text-xl font-bold text-foreground">{activeTier.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{activeTier.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tabular-nums text-foreground">{overallPct}%</span>
                  {overallPct > 0 && <TrendingUp className="h-5 w-5 text-primary-strong" />}
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {completed} critère{completed !== 1 ? "s" : ""} atteint{completed !== 1 ? "s" : ""} sur {available}
              </p>
            </div>

            {/* Criteria grid */}
            <CriteriaGrid progress={progress} tier={activeTier} />

            {/* What you unlock */}
            <div className="mb-8 rounded-2xl border border-white/[0.06] bg-card/30 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Ce que tu débloques en atteignant ce palier
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {activeTier.unlocks.map((unlock) => (
                  <div key={unlock} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary-strong/60" />
                    {unlock}
                  </div>
                ))}
              </div>
            </div>

            {/* Tips for missing criteria */}
            {unlockedTips.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Ce que tu peux faire maintenant
                </h2>
                {(() => {
                  const FREE_TIPS = 2;
                  const visibleTips = unlockedTips.slice(0, FREE_TIPS);
                  const lockedTips = unlockedTips.slice(FREE_TIPS);
                  const TipItem = (c: typeof unlockedTips[0]) => (
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
                          {activeTier.tips[c.id]}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <div className="space-y-2">
                      {visibleTips.map((c) => TipItem(c))}
                      {lockedTips.length > 0 && !isPro && (
                        <InlineLock
                          feature="progression_tips"
                          description="Toutes les actions pour progresser vers l'affiliation"
                          blurHeight="120px"
                        >
                          <div className="space-y-2">
                            {lockedTips.map((c) => TipItem(c))}
                          </div>
                        </InlineLock>
                      )}
                      {lockedTips.length > 0 && isPro && lockedTips.map((c) => TipItem(c))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Teaser: next tier */}
            {nextTier && (
              <div className="rounded-2xl border border-white/[0.04] bg-muted/10 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/30 bg-muted/30">
                      <Lock className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground/60">Palier suivant</p>
                      <p className="text-xs text-muted-foreground/40">{nextTier.label} — {nextTier.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Partner: show growth criteria anyway */}
        {isPartner && progress && (
          <CriteriaGrid progress={progress} tier={TIERS[3]} />
        )}
      </PageContainer>
    </AppShell>
  );
};

export default AffiliationPage;
