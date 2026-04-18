import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Radio,
  Sparkles,
  Lightbulb,
  Target,
  Compass,
  TrendingUp,
  Copy,
  Activity,
  Film,
  CalendarRange,
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
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { runTeaserAnalysis } from "@/services/teaserAnalysisRunner";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  type SavedReport,
} from "@/services/reportRepository";
import type { AnalysisReport } from "@/types/analysis";
import { Scale, ArrowRight } from "lucide-react";

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

  // Regularity (consistency)
  const tCons = factNum(target, "posting_consistency_score");
  const mCons = factNum(mine, "posting_consistency_score");
  rows.push({
    key: "regularity",
    label: "Régularité",
    status:
      tCons - mCons >= 15 ? "ahead" : mCons - tCons >= 15 ? "behind" : "similar",
    theirs: `${tCons}/100`,
    yours: `${mCons}/100`,
    gapWeight: Math.max(0, tCons - mCons) * 1.2,
    mechanic: "Fixer 3 créneaux fixes par semaine et les tenir 4 semaines de suite.",
  });

  // Clips activity (discovery loop)
  const tClips = factNum(target, "clips_30d");
  const mClips = factNum(mine, "clips_30d");
  rows.push({
    key: "clips",
    label: "Loop discovery (clips)",
    status:
      tClips - mClips >= 3 ? "ahead" : mClips - tClips >= 3 ? "behind" : "similar",
    theirs: `${tClips} clips/30j`,
    yours: `${mClips} clips/30j`,
    gapWeight: Math.max(0, tClips - mClips) * 2,
    mechanic: "Publier 2-3 clips après chaque stream pour activer la discovery.",
  });

  // Category consistency (lower switch rate = more stable)
  const tSwitch = factNum(target, "category_switch_rate");
  const mSwitch = factNum(mine, "category_switch_rate");
  rows.push({
    key: "category",
    label: "Stabilité catégorie",
    status:
      mSwitch - tSwitch >= 15 ? "ahead" : tSwitch - mSwitch >= 15 ? "behind" : "similar",
    theirs: `${tSwitch}% changement`,
    yours: `${mSwitch}% changement`,
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
      status:
        tPos - mPos >= 10 ? "ahead" : mPos - tPos >= 10 ? "behind" : "similar",
      theirs: `${tPos}/100`,
      yours: `${mPos}/100`,
      gapWeight: Math.max(0, tPos - mPos),
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
      status:
        tStr - mStr >= 10 ? "ahead" : mStr - tStr >= 10 ? "behind" : "similar",
      theirs: `${tStr}/100`,
      yours: `${mStr}/100`,
      gapWeight: Math.max(0, tStr - mStr) * 0.9,
      mechanic: "Standardiser une structure de titre récurrente sur tes lives.",
    });
  }

  return rows;
}

interface RelationFraming {
  label: string;
  tone: "primary" | "accent" | "secondary" | "muted";
  headline: string;
  why: string;
}

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

  const mineCategory = mine.channel_summary.category?.toLowerCase() ?? "";
  const targetCategory = target.channel_summary.category?.toLowerCase() ?? "";
  const sameCategory = !!mineCategory && mineCategory === targetCategory;

  const mineScore = mine.score.overall;
  const targetScore = target.score.overall;
  const delta = targetScore - mineScore;

  if (sameCategory && Math.abs(delta) <= 8) {
    return {
      relation: "direct",
      framing: {
        label: "Concurrent direct",
        tone: "primary",
        headline: "Ce streamer joue dans ta cour",
        why: "Même catégorie principale et niveau d'exécution proche du tien — un viewer pourrait hésiter entre vous deux.",
      },
    };
  }

  if (delta > 8 && delta <= 25) {
    return {
      relation: "catch-up",
      framing: {
        label: "À rattraper",
        tone: "accent",
        headline: "Profil à rattraper",
        why: "Ce streamer a un cran d'exécution au-dessus du tien. C'est exactement le type de chaîne dont tu peux copier les mécaniques.",
      },
    };
  }

  if (delta > 25) {
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
      setReport(result.record.report);
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

  // Tone classes for the "why this matters" card
  const toneStyles: Record<RelationFraming["tone"], string> = {
    primary: "border-primary/30 bg-primary/5",
    accent: "border-accent/30 bg-accent/5",
    secondary: "border-secondary/40 bg-secondary/10",
    muted: "border-border bg-muted/10",
  };

  return (
    <AppShell>
      <PageContainer>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link to={user ? "/competitors" : "/"}>
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
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
          description={`@${report.identity?.platform_login ?? summary.channel_name} · profil à inspecter pour comparer, apprendre et extraire des mécaniques utiles.`}
        />

        {/* Why this profile matters */}
        <Card className={`mb-6 ${toneStyles[framing.tone]}`}>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <Compass className="h-4 w-4 text-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{framing.headline}</h3>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {framing.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{framing.why}</p>
          </CardContent>
        </Card>

        {/* Comparison vs you */}
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
            ahead: "Iel devant",
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
                            Iel {r.theirs}
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

        {/* Key public benchmark signals */}
        <div className="mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Signaux benchmark publics
          </h2>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard score={score.overall} />
          <StatBlock
            label="Activité récente"
            value={`${streams30d} streams`}
            subtext="30 derniers jours"
          />
          <StatBlock
            label="Clips publiés"
            value={`${clips30d}`}
            subtext={clips30d > 0 ? "Loop de discovery actif" : "Peu ou pas de clips récents"}
          />
          <StatBlock
            label={summary.is_live ? "Live actuel" : "Audience VOD"}
            value={
              summary.is_live
                ? `${summary.live_viewer_count ?? 0} viewers`
                : String(summary.avg_viewers)
            }
            subtext={summary.is_live ? summary.live_title ?? "En direct" : "Vues moyennes par VOD"}
          />
        </div>

        {/* What they seem to do better */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <h3 className="text-sm font-semibold text-foreground">
                  Ce qu'iel fait mieux
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

        {/* Secondary signals row */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarRange className="h-3.5 w-3.5" /> Régularité
              </div>
              <p className="text-sm font-medium text-foreground">
                {consistency >= 70 ? "Cadence lisible" : consistency >= 40 ? "Cadence variable" : "Cadence irrégulière"}
              </p>
              <p className="text-xs text-muted-foreground">Score {consistency}/100</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5" /> Stabilité catégorie
              </div>
              <p className="text-sm font-medium text-foreground">
                {switchRate <= 20 ? "Très stable" : switchRate <= 50 ? "Moyennement stable" : "Très variable"}
              </p>
              <p className="text-xs text-muted-foreground">{switchRate}% de changement</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Film className="h-3.5 w-3.5" /> Loop discovery
              </div>
              <p className="text-sm font-medium text-foreground">
                {clips30d >= 5 ? "Actif" : clips30d > 0 ? "Modéré" : "Faible ou absent"}
              </p>
              <p className="text-xs text-muted-foreground">{clips30d} clips sur 30j</p>
            </CardContent>
          </Card>
        </div>

        {/* Visible weakness — kept compact, demoted */}
        {weakest && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="mb-1 flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-warning" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Point faible visible
                </h3>
              </div>
              <p className="text-sm text-foreground">
                {weakest.dimension} —{" "}
                <span className="text-muted-foreground">
                  {weakest.reasons[0] ?? "Signal public faible sur cette dimension."}
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        {summary.is_live && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Radio className="h-4 w-4 text-destructive" />
              <p className="text-sm text-foreground">
                Actuellement en live ·{" "}
                <span className="text-muted-foreground">{summary.live_title}</span>
              </p>
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
