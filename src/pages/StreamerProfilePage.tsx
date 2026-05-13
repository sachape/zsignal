import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Lightbulb,
  Target,
  Compass,
  TrendingUp,
  Copy,
  Scale,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Radio,
  Video,
  Eye,
  Clock,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import ScoreCard from "@/components/ScoreCard";
import StatBlock from "@/components/StatBlock";
import { ErrorState, LoadingState } from "@/components/StateView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { runTeaserAnalysis } from "@/services/teaserAnalysisRunner";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  type SavedReport,
} from "@/services/reportRepository";
import type { AnalysisReport } from "@/types/analysis";
import {
  addToWatchlist,
  isInWatchlist,
  removeFromWatchlist,
} from "@/services/benchmarkWatchlist";
import { recordSnapshot, getSnapshots } from "@/services/competitorSnapshots";
import CompetitorTrendChart from "@/components/CompetitorTrendChart";
import { toast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/usePageMeta";
import { evaluatePairwiseFit, type CandidateChannel, type TargetSignal } from "@/services/competitorEngine";

type Relation = "direct" | "catch-up" | "inspiration" | "self" | "none" | "unknown";

type CompStatus = "ahead" | "similar" | "behind" | "unknown";

interface CompRow {
  key: string;
  label: string;
  status: CompStatus;
  theirs: string;
  yours: string;
  /** Higher = more important gap to focus on first. */
  gapWeight: number;
  /** Concrete mechanic to copy if they are ahead. */
  mechanic: string;
}

function factNum(report: AnalysisReport, key: string): number {
  const f = report.facts.find((x) => x.key === key);
  return Number(f?.value ?? 0);
}

function buildComparison(target: AnalysisReport, mine: AnalysisReport): CompRow[] {
  const rows: CompRow[] = [];
  const fmtScore = (v: number) => (v === 0 ? "—" : `${v}/100`);
  const fmtPct = (v: number) => (v === 0 ? "—" : `${v}%`);
  const fmtClips = (v: number) => (v === 0 ? "—" : `${v} clips/30j`);
  const noData = (a: number, b: number) => a === 0 && b === 0;
  // Dimensions computed from activity data are only meaningful when the user
  // has streamed recently. Below this threshold, 0 streams can paradoxically
  // produce perfect scores (e.g. positionnement = 100 because 0 category changes).
  const myStreams30d = factNum(mine, "streams_30d");
  const myHasActivity = myStreams30d >= 2;

  // Regularity (consistency)
  const tCons = factNum(target, "posting_consistency_score");
  const mCons = factNum(mine, "posting_consistency_score");
  rows.push({
    key: "regularity",
    label: "Régularité",
    status: noData(tCons, mCons)
      ? "unknown"
      : tCons - mCons >= 15 ? "ahead" : mCons - tCons >= 15 ? "behind" : "similar",
    theirs: fmtScore(tCons),
    yours: fmtScore(mCons),
    gapWeight: Math.max(0, tCons - mCons) * 1.2,
    mechanic: "Fixer 3 créneaux fixes par semaine et les tenir 4 semaines de suite.",
  });

  // Clips activity (discovery loop)
  const tClips = factNum(target, "clips_30d");
  const mClips = factNum(mine, "clips_30d");
  rows.push({
    key: "clips",
    label: "Loop discovery (clips)",
    status: noData(tClips, mClips)
      ? "unknown"
      : tClips - mClips >= 3 ? "ahead" : mClips - tClips >= 3 ? "behind" : "similar",
    theirs: fmtClips(tClips),
    yours: fmtClips(mClips),
    gapWeight: Math.max(0, tClips - mClips) * 2,
    mechanic: "Publier 2-3 clips après chaque stream pour activer la discovery.",
  });

  // Category consistency (lower switch rate = more stable)
  const tSwitch = factNum(target, "category_switch_rate");
  const mSwitch = factNum(mine, "category_switch_rate");
  rows.push({
    key: "category",
    label: "Stabilité catégorie",
    status: noData(tSwitch, mSwitch)
      ? "unknown"
      : mSwitch - tSwitch >= 15 ? "ahead" : tSwitch - mSwitch >= 15 ? "behind" : "similar",
    theirs: fmtPct(tSwitch),
    yours: fmtPct(mSwitch),
    gapWeight: Math.max(0, mSwitch - tSwitch) * 0.8,
    mechanic: "Garder une catégorie principale claire pendant 3-4 streams d'affilée.",
  });

  // Positioning / structure via score breakdown
  const dimScore = (rep: AnalysisReport, name: string) =>
    rep.score.breakdown.find((b) =>
      b.dimension.toLowerCase().includes(name.toLowerCase()),
    )?.score ?? 0;

  const tPos = dimScore(target, "positionnement") || dimScore(target, "positioning");
  const mPos = dimScore(mine, "positionnement") || dimScore(mine, "positioning");
  if (tPos || mPos) {
    rows.push({
      key: "positioning",
      label: "Clarté du positionnement",
      // If user has no activity, positionnement = 100 is a false positive (0 streams = 0 changes).
      // Show "—" instead of a misleading perfect score.
      status: !myHasActivity || noData(tPos, mPos)
        ? "unknown"
        : tPos - mPos >= 10 ? "ahead" : mPos - tPos >= 10 ? "behind" : "similar",
      theirs: fmtScore(tPos),
      yours: !myHasActivity ? "—" : fmtScore(mPos),
      gapWeight: !myHasActivity ? tPos * 0.5 : Math.max(0, tPos - mPos),
      mechanic: "Clarifier la bio et un titre récurrent qui dit ce que tu fais.",
    });
  }

  // Content structure
  const tStr = dimScore(target, "structure") || dimScore(target, "contenu");
  const mStr = dimScore(mine, "structure") || dimScore(mine, "contenu");
  if (tStr || mStr) {
    rows.push({
      key: "structure",
      label: "Structure du contenu",
      status: !myHasActivity || noData(tStr, mStr)
        ? "unknown"
        : tStr - mStr >= 10 ? "ahead" : mStr - tStr >= 10 ? "behind" : "similar",
      theirs: fmtScore(tStr),
      yours: !myHasActivity ? "—" : fmtScore(mStr),
      gapWeight: !myHasActivity ? tStr * 0.4 : Math.max(0, tStr - mStr) * 0.9,
      mechanic: "Standardiser une structure de titre récurrente sur tes lives.",
    });
  }

  return rows;
}

type MechanicUsefulness =
  | "copy"
  | "observe"
  | "inspiring"
  | "too-advanced"
  | "progression";

interface ObservedMechanic {
  key: string;
  label: string;
  detail: string;
  usefulness: MechanicUsefulness;
  certainty: "strong" | "soft";
}

const usefulnessMeta: Record<MechanicUsefulness, { label: string; tone: string }> = {
  copy: { label: "Utile à copier", tone: "border-primary/40 bg-primary/10 text-primary" },
  observe: { label: "À observer", tone: "border-border bg-muted/30 text-muted-foreground" },
  inspiring: {
    label: "Inspiration",
    tone: "border-secondary/40 bg-secondary/20 text-foreground",
  },
  "too-advanced": {
    label: "Trop avancé pour l'instant",
    tone: "border-warning/40 bg-warning/10 text-warning",
  },
  progression: {
    label: "Bon signal de progression",
    tone: "border-success/30 bg-success/10 text-success",
  },
};

function buildObservedMechanics(
  target: AnalysisReport,
  mine: AnalysisReport | null,
): ObservedMechanic[] {
  const out: ObservedMechanic[] = [];
  const num = (k: string) => factNum(target, k);

  const switchRate = num("category_switch_rate");
  const consistency = num("posting_consistency_score");
  const clips30 = num("clips_30d");
  const streams30 = num("streams_30d");
  const streams7 = num("streams_7d");
  const avgDur = num("avg_duration_minutes");
  const category = target.channel_summary.category;
  const broadcasterType = target.channel_summary.broadcaster_type;
  const targetScore = target.score.overall;
  const mineScore = mine?.score.overall ?? 0;
  const tooAdvanced = !!mine && targetScore - mineScore >= 30;

  if (category && switchRate <= 25 && streams30 >= 4) {
    out.push({
      key: "category-stable",
      label: "Catégorie principale stable",
      detail: `Reste majoritairement sur ${category} (${switchRate}% de changement sur 30j).`,
      usefulness: "copy",
      certainty: "strong",
    });
  } else if (category && switchRate <= 45) {
    out.push({
      key: "category-soft",
      label: "Tendance à garder une catégorie principale",
      detail: `Semble revenir souvent sur ${category}, signal modéré (${switchRate}%).`,
      usefulness: "observe",
      certainty: "soft",
    });
  }

  if (consistency >= 70 && streams7 >= 2) {
    out.push({
      key: "cadence-strong",
      label: "Cadence lisible et tenue",
      detail: `Streams concentrés sur des créneaux identifiables (régularité ${consistency}/100).`,
      usefulness: tooAdvanced ? "inspiring" : "copy",
      certainty: "strong",
    });
  } else if (consistency >= 45) {
    out.push({
      key: "cadence-soft",
      label: "Rythme partiellement lisible",
      detail: `Quelques créneaux récurrents, mais pas encore tenu de façon stable (${consistency}/100).`,
      usefulness: "observe",
      certainty: "soft",
    });
  }

  if (clips30 >= 8) {
    out.push({
      key: "clips-active",
      label: "Loop de clips actif",
      detail: `${clips30} clips publiés sur 30j — la discovery est entretenue régulièrement.`,
      usefulness: tooAdvanced ? "inspiring" : "copy",
      certainty: "strong",
    });
  } else if (clips30 >= 3) {
    out.push({
      key: "clips-mod",
      label: "Quelques clips publiés",
      detail: `${clips30} clips récents — loop discovery présente mais pas encore systématique.`,
      usefulness: "observe",
      certainty: "soft",
    });
  }

  if (avgDur >= 120 && streams30 >= 4) {
    out.push({
      key: "format-long",
      label: "Format long récurrent",
      detail: `Sessions de ~${Math.round(avgDur / 60)}h en moyenne, format reconnaissable.`,
      usefulness: "observe",
      certainty: "soft",
    });
  }

  if (broadcasterType === "partner") {
    out.push({
      key: "partner",
      label: "Profil Partenaire — setup public lisible",
      detail: "Statut Partenaire confirmé sur Twitch, généralement signe d'un profil bien posé.",
      usefulness: "inspiring",
      certainty: "strong",
    });
  } else if (broadcasterType === "affiliate") {
    out.push({
      key: "affiliate",
      label: "Profil Affilié actif",
      detail: "Statut Affilié atteint — bon signal de progression de palier.",
      usefulness: "progression",
      certainty: "strong",
    });
  }

  const structureDim =
    target.score.breakdown.find((b) => /structure|contenu/i.test(b.dimension))?.score ?? 0;
  if (structureDim >= 65) {
    out.push({
      key: "titles",
      label: "Structure de titres répétée détectée",
      detail: "Les titres récents semblent suivre un pattern reconnaissable.",
      usefulness: "copy",
      certainty: "soft",
    });
  }

  const posDim =
    target.score.breakdown.find((b) => /position|positionnement|positioning/i.test(b.dimension))?.score ?? 0;
  if (posDim >= 70) {
    out.push({
      key: "positioning",
      label: "Positionnement visiblement plus lisible",
      detail: "Le profil donne rapidement à comprendre ce que fait la chaîne.",
      usefulness: "copy",
      certainty: "soft",
    });
  }

  if (tooAdvanced && out.length > 0 && !out.some((o) => o.usefulness === "too-advanced")) {
    out.push({
      key: "scale-gap",
      label: "Échelle d'exécution nettement supérieure",
      detail: "Plusieurs mécaniques sont trop matures pour être copiées telles quelles aujourd'hui.",
      usefulness: "too-advanced",
      certainty: "strong",
    });
  }

  return out;
}


interface RelationFraming {
  label: string;
  tone: "primary" | "accent" | "secondary" | "muted";
  headline: string;
  why: string;
}

/**
 * Build the relation between target and connected user using the SAME
 * benchmark engine as the global Competitors page (evaluatePairwiseFit).
 * This guarantees that a profile labeled "concurrent direct" here is also
 * eligible to surface in the Competitors page (assuming source data exists).
 */
function buildRelation(
  target: AnalysisReport,
  mine: AnalysisReport | null,
  isSelf: boolean,
): { relation: Relation; framing: RelationFraming } {
  if (isSelf) {
    return {
      relation: "self",
      framing: {
        label: "C'est ta chaîne",
        tone: "secondary",
        headline: "Profil de ta propre chaîne",
        why: "Tu regardes ton propre profil tel qu'il apparaît côté benchmark.",
      },
    };
  }

  if (!mine) {
    return {
      relation: "unknown",
      framing: {
        label: "Profil intéressant à observer",
        tone: "muted",
        headline: "Pourquoi ce profil est utile",
        why: "Connecte ta chaîne pour situer ce streamer par rapport à toi (concurrent, à rattraper, ou inspiration).",
      },
    };
  }

  // Build a TargetSignal from "mine" and a CandidateChannel from the opened
  // streamer, then run the shared engine. This is the exact same scoring that
  // feeds the global Competitors page.
  const mineRecentTitles: string[] = [];
  const myTarget: TargetSignal = {
    login: mine.identity?.platform_login ?? mine.channel_summary.channel_name,
    language: "fr",
    dominant_category: mine.channel_summary.category ?? null,
    recent_titles: mineRecentTitles,
    channel_type: "solo",
    content_format: "unknown",
    size_proxy:
      mine.channel_summary.follower_count ||
      mine.channel_summary.avg_viewers * 1000 ||
      0,
  };
  const candidate: CandidateChannel = {
    id: target.identity?.platform_user_id ?? target.channel_summary.channel_name,
    login: target.identity?.platform_login ?? target.channel_summary.channel_name,
    display_name: target.channel_summary.display_name,
    broadcaster_type: target.channel_summary.broadcaster_type,
    description: target.channel_summary.description,
    is_live: !!target.channel_summary.is_live,
    live_title: target.channel_summary.live_title ?? null,
    live_viewer_count: target.channel_summary.live_viewer_count ?? null,
    game_name: target.channel_summary.category ?? null,
    language: "fr",
    recent_titles: target.channel_summary.live_title
      ? [target.channel_summary.live_title]
      : [],
    view_count:
      target.channel_summary.follower_count ||
      target.channel_summary.avg_viewers * 1000 ||
      0,
  };

  const fit = evaluatePairwiseFit(myTarget, candidate);

  if (fit.relation === "direct") {
    if (fit.is_potential) {
      return {
        relation: "direct",
        framing: {
          label: "Concurrent direct potentiel",
          tone: "primary",
          headline: "Match direct à confirmer",
          why: "Le moteur de benchmark le considère proche de toi, mais le signal n'est pas complet. À observer comme un concurrent direct probable.",
        },
      };
    }
    return {
      relation: "direct",
      framing: {
        label: "Concurrent direct",
        tone: "primary",
        headline: "Ce streamer joue dans ta cour",
        why: "Catégorie, format et taille proches du tien selon le moteur benchmark — un viewer pourrait hésiter entre vous deux.",
      },
    };
  }

  if (fit.relation === "catch-up") {
    return {
      relation: "catch-up",
      framing: {
        label: "À rattraper",
        tone: "accent",
        headline: "Profil à rattraper",
        why: "Un cran d'exécution au-dessus du tien, mais réaliste. C'est exactement le type de chaîne dont tu peux copier les mécaniques.",
      },
    };
  }

  if (fit.relation === "inspiration") {
    return {
      relation: "inspiration",
      framing: {
        label: "Inspiration",
        tone: "secondary",
        headline: "À regarder comme une inspiration",
        why: "Très loin devant en exécution publique. À observer pour la mécanique, pas comme concurrent immédiat.",
      },
    };
  }

  return {
    relation: "none",
    framing: {
      label: "Pas directement comparable",
      tone: "muted",
      headline: "Profil utile à observer",
      why: "Pas de chevauchement direct évident, mais ce profil reste utile pour repérer une mécanique précise.",
    },
  };
}

const StreamerProfilePage = () => {
  const { login } = useParams<{ login: string }>();
  const { user } = useAuth();
  const { account } = useTwitchConnection();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [myReport, setMyReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [snapshots, setSnapshots] = useState(() =>
    login ? getSnapshots(user?.id ?? null, login) : [],
  );

  useEffect(() => {
    if (!login) {
      setInWatchlist(false);
      return;
    }
    setInWatchlist(isInWatchlist(user?.id ?? null, login));
    const sync = () => setInWatchlist(isInWatchlist(user?.id ?? null, login));
    window.addEventListener("streampulse:watchlist-changed", sync);
    return () => window.removeEventListener("streampulse:watchlist-changed", sync);
  }, [user?.id, login]);

  useEffect(() => {
    if (!login) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setReport(null);

      const result = await runTeaserAnalysis({ channelInput: login });
      if (cancelled) return;

      if (result.ok !== true) {
        setError(result.reason);
        setLoading(false);
        return;
      }
      const r = result.record.report;
      setReport(r);

      // Record a snapshot for competitor trend tracking (watchlisted profiles only)
      try {
        const loginKey = r.identity?.platform_login ?? r.channel_summary.channel_name ?? login;
        const clips30d = Number(r.facts.find((f) => f.key === "clips_30d")?.value ?? 0) || null;
        const streams30d = Number(r.facts.find((f) => f.key === "streams_30d")?.value ?? 0) || null;
        // Hydrate cache from DB first so the chart shows full history.
        const { loadSnapshotsFromDb } = await import("@/services/competitorSnapshots");
        await loadSnapshotsFromDb(user?.id ?? null, loginKey);
        await recordSnapshot(user?.id ?? null, loginKey, {
          stream_score: r.score.overall ?? null,
          avg_viewers: r.channel_summary.avg_viewers || null,
          clips_30d: clips30d,
          streams_30d: streams30d,
          is_live: !!r.channel_summary.is_live,
        });
        if (!cancelled) setSnapshots(getSnapshots(user?.id ?? null, loginKey));
      } catch {
        /* snapshot recording is best-effort */
      }

      // Track this opened benchmark profile so the global Competitors page
      // can use it as a seed when the connected account itself lacks signal.
      try {
        const { trackOpenedProfile } = await import("@/services/recentlyOpenedProfiles");
        trackOpenedProfile(user?.id ?? null, {
          login: r.channel_summary.channel_name?.toLowerCase() || login,
          display_name:
            r.identity?.display_name ?? r.channel_summary.channel_name ?? login,
          category: r.channel_summary.category ?? null,
          language: null,
        });
      } catch {
        /* tracking is best-effort */
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [login]);

  useEffect(() => {
    if (!user) {
      setMyReport(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const r = account?.platform_user_id
        ? await getLatestReportForPlatformUser(user.id, account.platform_user_id)
        : await getLatestReport(user.id);
      if (!cancelled) setMyReport(r);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, account?.platform_user_id]);

  const pageMeta = useMemo(() => {
    if (!report) return null;
    const streams30d = Number(report.facts.find((f) => f.key === "streams_30d")?.value ?? 0);
    const name = report.channel_summary.display_name;
    const cat = report.channel_summary.category;
    return {
      title: `${name} — Profil Twitch`,
      description: `Analyse publique de ${name} : StreamScore ${report.score.overall}/100${streams30d > 0 ? `, ${streams30d} streams/30j` : ""}${cat ? `, catégorie ${cat}` : ""}.`,
      ogTitle: `${name} — Profil Twitch`,
      ogDescription: `StreamScore ${report.score.overall}/100 · ${cat ?? "Twitch"} · Découvrez les mécaniques de cette chaîne.`,
      ogImage: report.identity?.avatar_url ?? undefined,
      ogType: "profile" as const,
      canonical: `https://streamnco.com/streamer/${login}`,
    };
  }, [report, login]);
  usePageMeta(pageMeta);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !report) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <ErrorState
            title={error === "not_found" ? "Chaîne introuvable" : "Analyse impossible"}
            description={
              error === "not_found"
                ? `Aucune chaîne Twitch trouvée pour "${login}".`
                : "On n'a pas pu récupérer cette chaîne pour le moment."
            }
            action={
              <Button asChild variant="outline">
                <Link to={user ? "/dashboard" : "/"}>Retour</Link>
              </Button>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  const summary = report.channel_summary;
  const score = report.score;
  const sortedBreakdown = score.breakdown.slice().sort((a, b) => b.score - a.score);
  const strongest = sortedBreakdown[0];
  const secondStrongest = sortedBreakdown[1];
  const weakest = sortedBreakdown[sortedBreakdown.length - 1];

  const isSelf =
    !!account?.platform_login &&
    !!login &&
    account.platform_login.toLowerCase() === login.toLowerCase();

  const { framing } = buildRelation(report, myReport?.report ?? null, isSelf);

  const factByKey = (k: string) => report.facts.find((f) => f.key === k);
  const streams30d = Number(factByKey("streams_30d")?.value ?? 0);
  const clips30d = Number(factByKey("clips_30d")?.value ?? 0);
  const consistency = Number(factByKey("posting_consistency_score")?.value ?? 0);
  const switchRate = Number(factByKey("category_switch_rate")?.value ?? 0);

  // "What is worth copying" — pick from strongest dimension levers, fall back to second strongest
  const copyableMechanics: string[] = [];
  if (strongest?.levers?.length) copyableMechanics.push(...strongest.levers.slice(0, 2));
  if (copyableMechanics.length < 2 && secondStrongest?.levers?.length) {
    copyableMechanics.push(...secondStrongest.levers.slice(0, 2 - copyableMechanics.length));
  }
  if (copyableMechanics.length === 0 && strongest?.reasons?.length) {
    copyableMechanics.push(`Reproduire ce qui fonctionne sur ${strongest.dimension.toLowerCase()}.`);
  }

  return (
    <AppShell>
      <PageContainer>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link to={user ? "/classements" : "/"}>
            <ArrowLeft className="h-3.5 w-3.5" /> Classements
          </Link>
        </Button>

        <PageHeader
          eyebrow="Profil benchmark · données publiques"
          title={summary.display_name}
          avatarUrl={report.identity?.avatar_url ?? null}
          avatarLogin={report.identity?.platform_login ?? summary.channel_name}
          badges={[
            ...(summary.broadcaster_type === "partner"
              ? [{ label: "Partenaire", variant: "accent" as const }]
              : summary.broadcaster_type === "affiliate"
                ? [{ label: "Affilié", variant: "secondary" as const }]
                : []),
            ...(summary.is_live
              ? [{ label: "Live", variant: "destructive" as const }]
              : [{ label: "Hors-ligne", variant: "outline" as const }]),
            ...(summary.category ? [{ label: summary.category, variant: "outline" as const }] : []),
            { label: framing.label, variant: "secondary" as const },
          ]}
          description={null}
        />

        {/* Acquisition CTA — only for anonymous visitors */}
        {!user && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Tu streames toi aussi ?
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Analyse ta chaîne Twitch gratuitement — StreamScore, progression affilié, benchmarks concurrents.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/">Analyser ma chaîne →</Link>
            </Button>
          </div>
        )}

        {/* Quick actions — why inspect + compare CTA */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Pourquoi inspecter ce profil
              </h3>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {framing.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {framing.tone === "primary"
                ? "C'est un concurrent direct — chaque mécanique copiée peut basculer un viewer hésitant."
                : framing.tone === "accent"
                  ? "Profil à rattraper — un cran d'exécution à aller chercher avant d'optimiser ailleurs."
                  : framing.tone === "secondary"
                    ? "Inspirant : observe la mécanique, garde-le pour plus tard."
                    : "Profil utile à observer pour repérer une mécanique précise."}
            </p>
            <div className="flex items-center gap-2">
              {user && !isSelf ? (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    const el = document.getElementById("comparison-vs-you");
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <Scale className="h-3.5 w-3.5" /> Comparer maintenant
                </Button>
              ) : !user ? (
                <Button asChild size="sm" variant="default">
                  <Link to="/">Analyser ma chaîne</Link>
                </Button>
              ) : null}
              <Button
                size="sm"
                variant={inWatchlist ? "secondary" : "outline"}
                className="px-2.5"
                title={inWatchlist ? "Retirer de la watchlist" : "Ajouter à la watchlist"}
                onClick={() => {
                  const loginKey = report.identity?.platform_login ?? summary.channel_name;
                  if (inWatchlist) {
                    removeFromWatchlist(user?.id ?? null, loginKey);
                    setInWatchlist(false);
                  } else {
                    addToWatchlist(user?.id ?? null, {
                      login: loginKey,
                      display_name: summary.display_name,
                      category: summary.category ?? null,
                      avatar_url: report.identity?.avatar_url ?? null,
                    });
                    setInWatchlist(true);
                    toast({ title: "Ajouté à la watchlist" });
                  }
                }}
              >
                {inWatchlist ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key public benchmark signals */}
        <div className="mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Signaux publics
          </h2>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard score={score.overall} />
          <StatBlock
            label="Activité récente"
            value={`${formatNumber(streams30d)} streams`}
            subtext="30 derniers jours"
          />
          <StatBlock
            label="Clips publiés"
            value={formatNumber(clips30d)}
            subtext={clips30d > 0 ? "Loop de discovery actif" : "Peu ou pas de clips récents"}
          />
          <StatBlock
            label={summary.is_live ? "Live actuel" : "Audience VOD"}
            value={
              summary.is_live
                ? `${formatNumber(summary.live_viewer_count ?? 0)} viewers`
                : formatNumber(summary.avg_viewers)
            }
            subtext={summary.is_live ? summary.live_title ?? "En direct" : "Vues moyennes par VOD"}
          />
        </div>

        {/* Live preview + VODs */}
        {(() => {
          const channelLogin = (report.identity?.platform_login ?? summary.channel_name ?? login ?? "").toLowerCase();
          const videos = (report.videos ?? []).filter((v) => v.type === "archive" || v.type === "highlight");
          const hasLive = summary.is_live;
          const hasVideos = videos.length > 0;

          if (!hasLive && !hasVideos) return null;

          return (
            <div className="mb-6 space-y-4">

              {/* Live thumbnail */}
              {hasLive && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5 text-destructive" />
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Live en cours
                    </h2>
                  </div>
                  <a
                    href={`https://www.twitch.tv/${channelLogin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block overflow-hidden rounded-2xl border border-white/[0.07] bg-card/40 backdrop-blur-xl transition-all hover:border-white/[0.18] hover:shadow-[0_0_40px_hsl(var(--destructive)/0.15)]"
                  >
                    <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                      <img
                        src={`https://static-cdn.jtvnw.net/previews-ttv/live_user_${channelLogin}-880x495.jpg`}
                        alt={summary.live_title ?? "Live en cours"}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <div className="rounded-full border border-white/20 bg-black/50 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm">
                          Regarder sur Twitch →
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                            Live
                          </span>
                          {(summary.live_viewer_count ?? 0) > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-white/90">
                              <Eye className="h-3 w-3" />
                              {formatNumber(summary.live_viewer_count!)} viewers
                            </span>
                          )}
                        </div>
                        {summary.live_title && (
                          <p className="text-sm font-medium leading-snug text-white line-clamp-2">
                            {summary.live_title}
                          </p>
                        )}
                      </div>
                    </div>
                  </a>
                </div>
              )}

              {/* VOD grid */}
              {hasVideos && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Video className="h-3.5 w-3.5 text-muted-foreground" />
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Derniers VODs
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {videos.slice(0, 6).map((v) => {
                      const daysAgo = v.created_at
                        ? Math.round((Date.now() - new Date(v.created_at).getTime()) / 86_400_000)
                        : null;
                      const dateLabel = daysAgo === null ? "" : daysAgo === 0 ? "Aujourd'hui" : daysAgo === 1 ? "Hier" : `il y a ${daysAgo}j`;
                      const Wrapper = v.url ? "a" : "div";
                      const wrapperProps = v.url
                        ? { href: v.url, target: "_blank", rel: "noopener noreferrer" }
                        : {};
                      return (
                        <Wrapper
                          key={v.id}
                          {...wrapperProps}
                          className="group overflow-hidden rounded-xl border border-white/[0.07] bg-card/40 backdrop-blur-xl transition-all hover:border-white/[0.14] hover:shadow-[0_0_20px_hsl(var(--primary)/0.08)]"
                        >
                          {/* Thumbnail */}
                          <div className="relative w-full bg-muted/40" style={{ aspectRatio: "16/9" }}>
                            {v.thumbnail_url ? (
                              <img
                                src={v.thumbnail_url}
                                alt={v.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Video className="h-6 w-6 text-muted-foreground/30" />
                              </div>
                            )}
                            {/* Duration badge */}
                            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm">
                              {v.duration}
                            </span>
                          </div>
                          {/* Meta */}
                          <div className="p-3">
                            <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
                              {v.title || "Sans titre"}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground/60">
                              <span className="flex items-center gap-1">
                                <Eye className="h-2.5 w-2.5" />
                                {formatNumber(v.view_count)}
                              </span>
                              {dateLabel && <span>· {dateLabel}</span>}
                            </div>
                          </div>
                        </Wrapper>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          );
        })()}

        {/* What they seem to do better */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <h3 className="text-sm font-semibold text-foreground">
                  Ce que {summary.display_name} fait mieux
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                D'après les signaux publics, voici les forces les plus visibles de ce profil.
              </p>
              <div className="space-y-3">
                {[strongest, secondStrongest].filter(Boolean).map((dim) => (
                  <div key={dim!.dimension} className="rounded-md border border-border/60 bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {dim!.dimension}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {dim!.score}/100
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dim!.reasons[0] ?? "Signal public stable sur cette dimension."}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* What is worth copying */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <Copy className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Ce qui vaut le coup d'être copié
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Mécaniques concrètes que tu peux tester sur ta propre chaîne cette semaine.
              </p>
              <ul className="space-y-2">
                {copyableMechanics.map((m, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <Lightbulb className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span>{m}</span>
                  </li>
                ))}
                {copyableMechanics.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Pas assez de signaux publics pour extraire une mécanique précise.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Comparison vs you */}
        <div id="comparison-vs-you">
        {(() => {
          if (isSelf) return null;
          if (!user) return null;
          if (!myReport?.report) {
            return (
              <Card className="mb-6 border-dashed">
                <CardContent className="p-5">
                  <div className="mb-1 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Comparaison vs toi</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Lance une première analyse de ta chaîne pour comparer ce profil au tien.
                  </p>
                </CardContent>
              </Card>
            );
          }

          const rows = buildComparison(report, myReport.report);
          const aheadRows = rows.filter((r) => r.status === "ahead");
          const mainGap = aheadRows.slice().sort((a, b) => b.gapWeight - a.gapWeight)[0];
          const tooThin = rows.length === 0 || aheadRows.length === 0 && rows.every((r) => r.status === "unknown");

          const statusStyles: Record<CompStatus, string> = {
            ahead: "text-warning",
            behind: "text-success",
            similar: "text-muted-foreground",
            unknown: "text-muted-foreground",
          };
          const statusLabel: Record<CompStatus, string> = {
            ahead: `${summary.display_name} devant`,
            behind: "Toi devant",
            similar: "Similaire",
            unknown: "Indispo.",
          };

          return (
            <Card className="mb-6">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Comparaison vs toi</h3>
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {rows.length} dimensions clés
                  </Badge>
                </div>

                {tooThin ? (
                  <p className="text-sm text-muted-foreground">
                    Pas assez de signaux publics communs pour comparer en détail. Observation utile : ce
                    profil semble surtout intéressant à observer pour sa cadence et sa loop de clips.
                  </p>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      {rows.map((r) => (
                        <div
                          key={r.key}
                          className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md border border-border/40 bg-background/30 px-3 py-2"
                        >
                          <span className="text-sm text-foreground">{r.label}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {summary.display_name} {r.theirs}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            Toi {r.yours}
                          </span>
                          <span className={`text-[11px] font-medium ${statusStyles[r.status]}`}>
                            {statusLabel[r.status]}
                          </span>
                        </div>
                      ))}
                    </div>

                    {mainGap && (
                      <div className="mt-4 rounded-md border border-warning/30 bg-warning/5 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warning">
                          <Target className="h-3.5 w-3.5" />
                          Écart principal à combler
                        </div>
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{mainGap.label}</span> — c'est l'écart le plus
                          significatif entre ce profil et toi en ce moment.
                        </p>
                      </div>
                    )}

                    {mainGap && (
                      <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                          <Lightbulb className="h-3.5 w-3.5" />
                          Première mécanique à copier
                        </div>
                        <p className="text-sm text-foreground flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                          <span>{mainGap.mechanic}</span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })()}
        </div>

        {/* Mécaniques observées */}
        {(() => {
          const mechanics = buildObservedMechanics(report, myReport?.report ?? null);
          if (mechanics.length === 0) {
            return (
              <Card className="mb-6 border-dashed">
                <CardContent className="p-5">
                  <div className="mb-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Mécaniques observées</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pas assez de signaux publics pour extraire des mécaniques fiables sur ce profil.
                  </p>
                </CardContent>
              </Card>
            );
          }
          return (
            <Card className="mb-6">
              <CardContent className="p-5">
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Mécaniques observées</h3>
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {mechanics.length} pattern{mechanics.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Patterns détectés à partir des signaux publics. Les signaux faibles sont marqués comme inférés.
                </p>
                <ul className="space-y-2">
                  {mechanics.map((m) => {
                    const meta = usefulnessMeta[m.usefulness];
                    return (
                      <li
                        key={m.key}
                        className="rounded-md border border-border/50 bg-background/30 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">
                                {m.certainty === "soft" ? `Probable : ${m.label}` : m.label}
                              </span>
                              {m.certainty === "soft" && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  signal faible
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{m.detail}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.tone}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })()}



        {/* Competitor trend — only shown when in watchlist */}
        {inWatchlist && !isSelf && (
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Évolution dans le temps</h3>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {snapshots.length} snapshot{snapshots.length > 1 ? "s" : ""}
                </Badge>
              </div>
              <CompetitorTrendChart snapshots={snapshots} login={login ?? ""} />
            </CardContent>
          </Card>
        )}

        {/* Page role footer */}
        <p className="mt-6 text-xs text-muted-foreground">
          <Sparkles className="inline h-3 w-3 mr-1" />
          Ce profil est une fiche benchmark — pour inspecter, comparer, et extraire des mécaniques. Ce n'est ni un teaser public, ni ton diagnostic complet.
        </p>
      </PageContainer>
    </AppShell>
  );
};

export default StreamerProfilePage;
