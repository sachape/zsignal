import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Users, Info, Bug, Compass, Lock } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import StreamerBenchmarkCard from "@/components/StreamerBenchmarkCard";
import OpportunityCard from "@/components/OpportunityCard";
import EmptyReportState from "@/components/EmptyReportState";
import NicheChooser from "@/components/NicheChooser";
import { LoadingState } from "@/components/StateView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  type SavedReport,
} from "@/services/reportRepository";
import { fetchLeaders, type LeaderChannel } from "@/services/leadersService";
import { buildCopyableOpportunities } from "@/services/opportunityEngine";
import { fetchLiveTwitchProfile } from "@/services/twitchLiveProfile";
import {
  buildCompetitorGroups,
  inspectCompetitorPool,
  type CandidateChannel,
  type CompetitorPoolDebug,
  type TargetSignal,
} from "@/services/competitorEngine";
import {
  resolveBenchmarkSeed,
  type BenchmarkSeed,
} from "@/services/benchmarkSeedResolver";
import { getPreferredNiche } from "@/services/preferredNiche";
import type { AnalysisReport, CompetitorGroup, CompetitorMatch } from "@/types/analysis";

interface RenderSection {
  key: string;
  title: string;
  description: string;
  badge: string;
  matches: CompetitorMatch[];
  emptyHint: string;
}

/** Two explicit experience modes. */
type PageMode = "personal" | "exploration";

/**
 * A candidate is "placeholder-quality" when its identity is too thin to be
 * surfaced as a credible benchmark profile. We never let those become primary
 * outputs (direct / direct-potential), and they don't count toward credibility.
 */
function isPlaceholderQuality(m: CompetitorMatch): boolean {
  const name = (m.display_name ?? "").trim();
  const login = (m.competitor_login ?? "").trim();
  if (!name || !login) return true;
  if (name.length < 2 || login.length < 2) return true;

  // Reject obvious "unknown / null / undefined" identity rows.
  if (/^(unknown|null|undefined|n\/?a|na|none|-+|\?+)$/i.test(name)) return true;
  if (/^(unknown|null|undefined|none|-+|\?+)$/i.test(login)) return true;

  // Reject synthetic placeholders like "UnknownRock", "UnknownLive", "Unknown42"
  if (/^unknown[a-z0-9_-]*$/i.test(name)) return true;
  if (/^unknown[a-z0-9_-]*$/i.test(login)) return true;

  // No category context AND no fit/confidence → not credible enough.
  const hasContext = (m.match_reasons?.length ?? 0) > 0;
  const hasScore = (m.fit_score ?? m.similarity_score ?? 0) > 0;
  if (!hasContext && !hasScore) return true;

  return false;
}

/**
 * A seed is "category-trustworthy" only if its category is a real benchmark
 * value. Empty / unknown / placeholder categories CANNOT activate personal mode
 * even if the seed source is otherwise medium-trust.
 */
function isSeedCategoryTrustworthy(seed: BenchmarkSeed | null): boolean {
  if (!seed) return false;
  const v = (seed.category ?? "").trim();
  if (v.length < 2) return false;
  if (/^(unknown|inconnu|inconnue|n\/?a|null|undefined|none|-+|\?+)$/i.test(v)) {
    return false;
  }
  return true;
}

const CompetitorsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { account, loading: connectionLoading } = useTwitchConnection();
  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [nicheLeaders, setNicheLeaders] = useState<LeaderChannel[]>([]);
  const [nicheLeadersLoading, setNicheLeadersLoading] = useState(false);
  const [liveGroups, setLiveGroups] = useState<CompetitorGroup[] | null>(null);
  const [debug, setDebug] = useState<CompetitorPoolDebug | null>(null);
  const [seed, setSeed] = useState<BenchmarkSeed | null>(null);
  const [nicheVersion, setNicheVersion] = useState(0);

  // Re-run discovery when the user picks a niche.
  useEffect(() => {
    const handler = () => setNicheVersion((v) => v + 1);
    window.addEventListener("streampulse:preferred-niche-changed", handler);
    return () =>
      window.removeEventListener("streampulse:preferred-niche-changed", handler);
  }, []);

  useEffect(() => {
    if (authLoading || connectionLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const r = account?.platform_user_id
        ? await getLatestReportForPlatformUser(user.id, account.platform_user_id)
        : await getLatestReport(user.id);
      if (!cancelled) {
        setReport(r);
      }

      if (!cancelled && account?.platform_user_id) {
        try {
          const initialPreview = await fetchLiveTwitchProfile();

          // Resolve a TRUSTWORTHY seed. Returns null if no good source exists.
          const resolvedSeed = resolveBenchmarkSeed({
            userId: user.id,
            livePreview: initialPreview,
            report: r,
          });

          // Only request a category-hinted second pass if we have a real seed.
          // We never use a generic "Just Chatting" hint to fake direct matches.
          const needsHint =
            !!resolvedSeed &&
            (initialPreview.seed_source === "none" ||
              initialPreview.competitors.length === 0);
          const liveProfile = needsHint
            ? await fetchLiveTwitchProfile({
                category_hint: resolvedSeed!.category,
                language_hint: resolvedSeed!.language,
              })
            : initialPreview;

          const target: TargetSignal = {
            login:
              account.platform_login ??
              liveProfile.profile?.login ??
              r?.report.identity?.platform_login ??
              r?.report.channel_summary.channel_name ??
              "",
            language: resolvedSeed?.language ?? "fr",
            dominant_category:
              liveProfile.dominant_category ??
              resolvedSeed?.category ??
              r?.report.channel_summary.category ??
              null,
            recent_titles: liveProfile.videos.slice(0, 10).map((v) => v.title),
            channel_type: "solo",
            content_format: "unknown",
            size_proxy:
              liveProfile.follower_count ??
              liveProfile.profile?.view_count ??
              r?.report.channel_summary.follower_count ??
              ((r?.report.channel_summary.avg_viewers ?? 0) * 1000),
          };
          const candidates = liveProfile.competitors.map<CandidateChannel>((c) => ({
            id: c.id,
            login: c.login,
            display_name: c.display_name,
            profile_image_url: c.profile_image_url ?? null,
            broadcaster_type: c.broadcaster_type,
            description: c.description,
            is_live: c.is_live,
            live_title: c.title,
            live_viewer_count: c.live_viewer_count ?? null,
            game_name: c.game_name,
            language: c.language,
            recent_titles: c.title ? [c.title] : [],
            view_count: c.view_count,
          }));

          const computedGroups = buildCompetitorGroups({
            target,
            candidates,
            teaser: false,
          });
          const poolDebug = inspectCompetitorPool({
            target,
            candidates,
            teaser: false,
          });

          if (!cancelled) {
            setLiveGroups(computedGroups);
            setDebug(poolDebug);
            setSeed(resolvedSeed);
          }
        } catch {
          if (!cancelled) {
            setLiveGroups(null);
            setDebug(null);
            setSeed(null);
          }
        }
      } else if (!cancelled) {
        setLiveGroups(null);
        setDebug(null);
        setSeed(null);
      }

      if (!cancelled) {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, account, authLoading, connectionLoading, nicheVersion]);

  const effectiveGroups = useMemo(() => {
    if (liveGroups && liveGroups.length > 0) return liveGroups;
    return report?.report.competitor_groups ?? [];
  }, [liveGroups, report]);

  const allMatchesRaw = useMemo(
    () => effectiveGroups.flatMap((group) => group.matches),
    [effectiveGroups],
  );

  const allMatches = useMemo(
    () => allMatchesRaw.filter((m) => !isPlaceholderQuality(m)),
    [allMatchesRaw],
  );

  /**
   * Avatar coverage stats (dev-only debug). Counts only candidates that pass
   * the identity quality gate. A "real" avatar is a non-empty profile_image_url
   * URL string. Anything else falls back to initials in the card.
   */
  const avatarStats = useMemo(() => {
    const rendered = allMatches.length;
    const withAvatar = allMatches.filter(
      (m) => typeof m.profile_image_url === "string" && m.profile_image_url.length > 0,
    ).length;
    return {
      rendered,
      withAvatar,
      fallback: rendered - withAvatar,
      rejected: allMatchesRaw.length - rendered,
    };
  }, [allMatches, allMatchesRaw]);

  const directMatches = useMemo(
    () => allMatches.filter((m) => m.group === "direct"),
    [allMatches],
  );
  const confirmedDirect = useMemo(
    () => directMatches.filter((m) => !m.is_potential),
    [directMatches],
  );
  const potentialDirect = useMemo(
    () => directMatches.filter((m) => m.is_potential),
    [directMatches],
  );
  const catchUpMatches = useMemo(
    () => allMatches.filter((m) => m.group === "catch-up"),
    [allMatches],
  );
  const inspirationMatches = useMemo(
    () => allMatches.filter((m) => m.group === "inspiration"),
    [allMatches],
  );

  /**
   * Decide MODE.
   * Personal mode requires ALL of:
   *   - a non-null seed
   *   - seed.trust ≠ "weak"
   *   - seed category is a real, usable benchmark category (not "unknown")
   *   - at least one CREDIBLE rendered match after placeholder filtering
   * If any of those fail → exploration mode (no fake direct competitors).
   * The rejection reason is exposed in the dev debug block.
   */
  const modeDecision = useMemo<{ mode: PageMode; reason: string | null }>(() => {
    if (!seed) {
      return { mode: "exploration", reason: "no_trustworthy_seed" };
    }
    if (seed.trust === "weak") {
      return { mode: "exploration", reason: "seed_trust_weak" };
    }
    if (!isSeedCategoryTrustworthy(seed)) {
      return { mode: "exploration", reason: "category_unknown" };
    }
    const hasCredibleMatch =
      confirmedDirect.length > 0 ||
      catchUpMatches.length > 0 ||
      potentialDirect.some(
        (m) => (m.confidence_score ?? 0) >= 60 && (m.fit_score ?? 0) >= 60,
      );
    if (!hasCredibleMatch) {
      return {
        mode: "exploration",
        reason: "no_credible_candidates_after_filtering",
      };
    }
    return { mode: "personal", reason: null };
  }, [seed, confirmedDirect, potentialDirect, catchUpMatches]);
  const mode: PageMode = modeDecision.mode;

  const benchmarkReport: AnalysisReport | null = useMemo(() => {
    if (!report) return null;
    if (liveGroups) {
      return { ...report.report, competitor_groups: liveGroups };
    }
    return report.report;
  }, [report, liveGroups]);

  const opportunities = useMemo(
    () => (benchmarkReport ? buildCopyableOpportunities(benchmarkReport) : []),
    [benchmarkReport],
  );

  /**
   * In PERSONAL mode we render direct/direct-potential/catch-up/inspiration.
   * In EXPLORATION mode we NEVER render direct or direct-potential — we
   * fold credible "observe" candidates into a single safe section instead.
   */
  const renderSections: RenderSection[] = useMemo(() => {
    if (mode === "exploration") {
      const observe = [
        ...catchUpMatches,
        ...inspirationMatches,
        // demoted potentials become "à observer" only — never "direct"
        ...potentialDirect.filter(
          (m) => (m.confidence_score ?? 0) >= 50,
        ),
      ];
      if (observe.length === 0) return [];
      return [
        {
          key: "observe",
          title: "Profils à observer",
          description:
            "Profils potentiellement intéressants pour ta niche. Pas validés comme concurrents directs — à inspecter avant d'en tirer des conclusions.",
          badge: "À observer",
          matches: observe.slice(0, 9),
          emptyHint: "",
        },
      ];
    }

    const sections: RenderSection[] = [];
    if (confirmedDirect.length > 0) {
      sections.push({
        key: "direct-confirmed",
        title: "Concurrents directs",
        description:
          "Chaînes de taille comparable, mêmes format/langue, audience qui pourrait te regarder à la place.",
        badge: "Direct",
        matches: confirmedDirect,
        emptyHint: "",
      });
    }
    if (potentialDirect.length > 0) {
      sections.push({
        key: "direct-potential",
        title:
          confirmedDirect.length > 0
            ? "Concurrents directs potentiels"
            : "À observer de près",
        description:
          "Profils crédibles et proches, mais avec un ou plusieurs signaux encore incomplets. À confirmer via l'inspection de profil.",
        badge: "Direct potentiel",
        matches: potentialDirect,
        emptyHint: "",
      });
    }
    if (catchUpMatches.length > 0) {
      sections.push({
        key: "catch-up",
        title: "Chaînes à rattraper",
        description:
          "Un cran au-dessus, mais réalistes. Observe ce qui les a fait passer à l'étape suivante.",
        badge: "À rattraper",
        matches: catchUpMatches,
        emptyHint: "",
      });
    }
    if (inspirationMatches.length > 0) {
      sections.push({
        key: "inspiration",
        title: "Inspirations",
        description:
          "Chaînes plus avancées, utiles pour s'inspirer de patterns éditoriaux à long terme.",
        badge: "Inspiration",
        matches: inspirationMatches,
        emptyHint: "",
      });
    }
    return sections;
  }, [
    mode,
    confirmedDirect,
    potentialDirect,
    catchUpMatches,
    inspirationMatches,
  ]);

  // Niche leaders fallback: always useful in exploration; thin-fill in personal.
  useEffect(() => {
    const cat =
      mode === "exploration"
        ? (getPreferredNiche(user?.id)?.category ||
           benchmarkReport?.channel_summary.category ||
           seed?.category ||
           null)
        : (benchmarkReport?.channel_summary.category ||
           seed?.category ||
           getPreferredNiche(user?.id)?.category ||
           null);
    if (!cat) {
      setNicheLeaders([]);
      setNicheLeadersLoading(false);
      return;
    }
    if (mode === "personal" && allMatches.length >= 6) {
      setNicheLeaders([]);
      setNicheLeadersLoading(false);
      return;
    }
    let cancelled = false;
    setNicheLeadersLoading(true);
    (async () => {
      const data = await fetchLeaders({ category: cat });
      if (!cancelled) {
        setNicheLeaders(data.slice(0, 8));
        setNicheLeadersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [benchmarkReport, seed, mode, allMatches.length, user, nicheVersion]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <EmptyReportState
            title="Pas encore de concurrents identifiés"
            description="Lance une analyse pour découvrir les chaînes qui comptent vraiment pour ta progression."
          />
        </PageContainer>
      </AppShell>
    );
  }

  // In exploration mode the user's explicitly chosen niche takes priority.
  // In personal mode the live/report category drives the section context.
  const category =
    mode === "exploration"
      ? (getPreferredNiche(user?.id)?.category ??
         benchmarkReport?.channel_summary.category ??
         seed?.category ??
         null)
      : (benchmarkReport?.channel_summary.category ??
         seed?.category ??
         getPreferredNiche(user?.id)?.category ??
         null);
  const hasRenderableBenchmark = renderSections.length > 0;
  const copyMechanicsCount = opportunities.length;

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow={mode === "personal" ? "Benchmark" : "Exploration de niche"}
          title={
            mode === "personal"
              ? "Concurrents & inspirations"
              : "Explorer la niche"
          }
          description={
            mode === "personal"
              ? "Qui regarder, qui rattraper, et quelles mécaniques copier."
              : "Ton signal personnel n'est pas encore assez fiable pour un benchmark direct. Voici les profils à observer et les mécaniques à copier dans la niche."
          }
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/classements">
                <Trophy className="h-3.5 w-3.5" /> Voir les classements
              </Link>
            </Button>
          }
        />

        {import.meta.env.DEV && debug && (
          <Card className="mb-6 border-border/70 bg-card/60">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Bug className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Benchmark debug</p>
                <Badge variant="outline" className="text-[10px] text-primary">DEV only</Badge>
                <Badge variant="outline" className="text-[10px] text-primary">
                  Mode : {mode}
                </Badge>
                {modeDecision.reason && (
                  <Badge variant="outline" className="text-[10px] text-destructive">
                    personal_mode_rejected: {modeDecision.reason}
                  </Badge>
                )}
              </div>
              <div className="mb-3 rounded-md border border-border/60 bg-background/60 p-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Seed</p>
                {seed ? (
                  <>
                    <p>
                      Source: <span className="text-foreground">{seed.source}</span>{" "}
                      · Trust: <span className="text-foreground">{seed.trust}</span>{" "}
                      · Catégorie: <span className="text-foreground">{seed.category}</span>{" "}
                      · Langue: <span className="text-foreground">{seed.language}</span>
                    </p>
                    <p className="mt-1 italic">{seed.note}</p>
                  </>
                ) : (
                  <p className="italic">
                    Aucun seed fiable — passage en mode exploration.
                  </p>
                )}
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                <p>Total candidats: <span className="text-foreground">{debug.total_candidates}</span></p>
                <p>Direct confirmés: <span className="text-foreground">{debug.direct_confirmed}</span></p>
                <p>Direct potentiels: <span className="text-foreground">{debug.direct_potential}</span></p>
                <p>À rattraper: <span className="text-foreground">{debug.catch_up}</span></p>
                <p>Inspirations: <span className="text-foreground">{debug.inspiration}</span></p>
                <p>Copy mechanics: <span className="text-foreground">{copyMechanicsCount}</span></p>
              </div>
              <div className="mt-3 rounded-md border border-border/60 bg-background/60 p-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Couverture avatar</p>
                <p>
                  Rendus: <span className="text-foreground">{avatarStats.rendered}</span>{" "}
                  · avec avatar réel: <span className="text-foreground">{avatarStats.withAvatar}</span>{" "}
                  · fallback initiales: <span className="text-foreground">{avatarStats.fallback}</span>{" "}
                  · rejetés (qualité): <span className="text-foreground">{avatarStats.rejected}</span>
                </p>
              </div>
              {debug.filtered_out.length > 0 && (
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Filtrés</p>
                  {debug.filtered_out.slice(0, 8).map((item) => (
                    <p key={`${item.stage}-${item.login}`}>
                      @{item.login} · {item.stage === "excluded" ? "exclu" : "confiance faible"} · {item.reason}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {mode === "exploration" && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="flex items-start gap-3 p-4">
              <Compass className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Ton signal est encore trop faible pour un benchmark direct fiable.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Voici plutôt les profils à observer dans ta niche et les
                  mécaniques à copier. Pour affiner : lance ou termine un stream,
                  ouvre des profils benchmark, ou choisis explicitement ta niche
                  ci-dessous.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "exploration" && (
          <NicheChooser userId={user?.id} defaultLanguage="fr" />
        )}

        {mode === "exploration" && !category && !nicheLeadersLoading && (
          <div className="mb-8 flex flex-col items-center rounded-2xl border border-border/60 bg-card/30 p-8 text-center">
            <Trophy className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground">
              Sélectionne une niche pour explorer ses leaders
            </p>
            <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
              Choisis une catégorie ci-dessus pour voir en temps réel les streamers qui la dominent et comprendre ce qui fonctionne.
            </p>
          </div>
        )}

        {mode === "personal" && seed?.trust === "medium" && (
          <Card className="mb-6 border-border/70 bg-card/40">
            <CardContent className="flex items-start gap-3 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Benchmark basé sur{" "}
                  {seed.source === "selected_niche"
                    ? "la niche que tu as choisie"
                    : "ton dernier rapport"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Catégorie utilisée : « {seed.category} ». Lance ou termine un
                  stream pour passer à un signal personnel encore plus précis.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {hasRenderableBenchmark ? (
          renderSections.map((section) => (
            <section key={section.key} className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] text-primary">
                  {section.badge}
                </Badge>
                <SectionHeader
                  title={section.title}
                  description={section.description}
                  align="left"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.matches.map((m) => (
                  <StreamerBenchmarkCard
                    key={m.id}
                    competitor={m}
                    groupLabel={section.badge}
                  />
                ))}
              </div>
            </section>
          ))
        ) : mode === "personal" ? (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] text-primary">
                Benchmark
              </Badge>
              <SectionHeader
                title="Aucun match confirmé pour l'instant"
                description="Le moteur n'a pas validé de concurrent visible. Les leaders de niche et les opportunités restent affichés."
                align="left"
              />
            </div>
            <Card>
              <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
                <Users className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Aucun concurrent confirmé n'a été rendu depuis le benchmark
                  actif. Consulte les leaders de niche et les opportunités à
                  copier ci-dessous.
                </p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {(nicheLeaders.length > 0 || nicheLeadersLoading || (mode === "exploration" && !!category)) && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] text-primary">
                Leader de niche
              </Badge>
              <SectionHeader
                title={category ? `Leaders · ${category}` : "Leaders de niche"}
                description={
                  category
                    ? `Chaînes qui pèsent dans ${category}. À regarder pour comprendre ce qui fonctionne en haut de la catégorie.`
                    : "Chaînes qui pèsent dans ta catégorie principale."
                }
                align="left"
              />
            </div>
            {nicheLeadersLoading ? (
              <div className="grid gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex h-[60px] items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="h-4 w-4 animate-pulse rounded bg-muted/60" />
                    <div className="h-9 w-9 animate-pulse rounded-md bg-muted/60" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/5 animate-pulse rounded bg-muted/60" />
                      <div className="h-2 w-1/3 animate-pulse rounded bg-muted/60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : nicheLeaders.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-card/30 p-5 text-center">
                <p className="text-xs text-muted-foreground">
                  Aucun leader trouvé dans cette catégorie en ce moment.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-3">
                  {nicheLeaders.map((c, i) => {
                    const locked = i >= 3;
                    return (
                      <div key={c.id} className="relative">
                        <Link
                          to={locked ? "#" : `/streamer/${c.login}`}
                          onClick={locked ? (e) => e.preventDefault() : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
                            locked
                              ? "pointer-events-none select-none border-border/40 blur-[2px]"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <span className="w-5 shrink-0 text-right text-xs font-semibold text-muted-foreground">
                            {i + 1}
                          </span>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted text-[10px] font-semibold">
                            {c.profile_image_url ? (
                              <img
                                src={c.profile_image_url}
                                alt={c.login}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              c.login.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {c.display_name}
                              </p>
                              {c.is_live && (
                                <span className="shrink-0 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-destructive">
                                  Live
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              @{c.login}
                              {c.is_live && c.live_viewer_count
                                ? ` · ${c.live_viewer_count.toLocaleString("fr-FR")} viewers`
                                : c.game_name
                                  ? ` · ${c.game_name}`
                                  : ""}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold tabular-nums text-primary">
                              {c.stream_score}
                            </p>
                            <p className="text-[10px] text-muted-foreground">score</p>
                          </div>
                        </Link>
                        {locked && (
                          <div className="absolute inset-0 flex items-center justify-between gap-3 rounded-lg bg-background/70 px-4 backdrop-blur-[2px]">
                            <div className="flex items-center gap-2">
                              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">
                                Profil Pro
                              </span>
                            </div>
                            <Button asChild size="sm" variant="outline" className="h-7 text-[10px]">
                              <Link to="/pricing">Débloquer</Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {nicheLeaders.length > 3 && (
                  <p className="mt-3 text-center text-[10px] text-muted-foreground">
                    {nicheLeaders.length - 3} leader{nicheLeaders.length - 3 > 1 ? "s" : ""} supplémentaire{nicheLeaders.length - 3 > 1 ? "s" : ""} disponible{nicheLeaders.length - 3 > 1 ? "s" : ""} en Pro
                  </p>
                )}
              </>
            )}
          </section>
        )}

        <section>
          <SectionHeader
            title="Opportunités à copier"
            description="Mécaniques précises à mettre en place cette semaine. Tirées de ton blocage actuel et, quand c'est possible, de chaînes du benchmark."
            align="left"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((op, i) => (
              <OpportunityCard
                key={op.id}
                opportunity={op}
                index={i}
                locked={i >= 3}
              />
            ))}
          </div>
          {opportunities.length > 3 && (
            <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-primary/20 bg-primary/[0.04] px-6 py-5 text-center">
              <p className="text-sm font-semibold text-foreground">
                {opportunities.length - 3} opportunité{opportunities.length - 3 > 1 ? "s" : ""} supplémentaire{opportunities.length - 3 > 1 ? "s" : ""} disponible{opportunities.length - 3 > 1 ? "s" : ""}
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Passe au plan Pro pour voir toutes tes opportunités de croissance et les mettre en place cette semaine.
              </p>
              <Button asChild size="sm" className="mt-1 h-8 text-xs">
                <Link to="/pricing">Voir le plan Pro</Link>
              </Button>
            </div>
          )}
        </section>
      </PageContainer>
    </AppShell>
  );
};

export default CompetitorsPage;
