import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { usePlan } from "@/hooks/usePlan";
import { Link } from "react-router-dom";
import { Check, ChevronRight, ChevronsUpDown, Eye, Loader2, Radio, Trophy } from "lucide-react";
import { InlineLock } from "@/components/PaywallGate";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/StateView";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getScoreTier, getTierTheme } from "@/services/streamScoreTier";
import {
  fetchCategoryLeaders,
  searchCategories,
  LEADER_CATEGORY_PRESETS,
  LEADER_LANGUAGE_PRESETS,
  type LeaderChannel,
  type LeaderCategory,
} from "@/services/leadersService";
import { getLatestReport, type SavedReport } from "@/services/reportRepository";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StreamScoreLeaderboard from "@/components/leaders/StreamScoreLeaderboard";

type SortKey = "viewers" | "name";

const SORT_COMPARATORS: Record<SortKey, (a: LeaderChannel, b: LeaderChannel) => number> = {
  viewers: (a, b) => (b.live_viewer_count ?? 0) - (a.live_viewer_count ?? 0),
  name: (a, b) => a.display_name.localeCompare(b.display_name),
};

const formatViewers = (n: number | null): string => {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
};

/** Unique signal per channel — broadcaster_type takes priority, then audience size. */
function getSecondarySignal(
  c: LeaderChannel,
): { label: string; tone: "primary" | "warning" | "muted" | "destructive" } | null {
  if (c.broadcaster_type === "partner") return { label: "Partenaire", tone: "primary" };
  const v = c.live_viewer_count ?? 0;
  if (v >= 5000) return { label: "Top audience", tone: "destructive" };
  if (v >= 1000) return { label: "Forte audience", tone: "warning" };
  if (c.broadcaster_type === "affiliate") return { label: "Affilié", tone: "muted" };
  if (c.stream_score >= 70) return { label: "Score solide", tone: "muted" };
  return null;
}

const SIGNAL_TONE_CLASS: Record<"primary" | "warning" | "muted" | "destructive", string> = {
  primary: "border-primary/30 bg-primary/10 text-primary",
  warning: "border-warning/30 bg-warning/10 text-warning",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted/40 text-muted-foreground",
};

// Visual separators injected before these indices
const TIER_SEPARATORS: Record<number, string> = {
  3: "Suite du classement",
};

const FREE_LEADERS_LIMIT = 3;

const LeadersPage = () => {
  const { user } = useAuth();
  const { isPro } = usePlan();

  const [category, setCategory] = useState<string>("Just Chatting");
  const [language, setLanguage] = useState<string>("fr");
  const [sort, setSort] = useState<SortKey>("viewers");
  const [tab, setTab] = useState<"streamscore" | "live">("streamscore");

  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState<string>("");
  const [catSuggestions, setCatSuggestions] = useState<LeaderCategory[]>([]);
  const [catSearching, setCatSearching] = useState(false);

  const [rows, setRows] = useState<LeaderChannel[]>([]);
  const [resolvedCategory, setResolvedCategory] = useState<LeaderCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [userReport, setUserReport] = useState<SavedReport | null>(null);

  // Fetch user report once for personal position banner
  useEffect(() => {
    if (!user) return;
    getLatestReport(user.id).then((r) => setUserReport(r));
  }, [user]);

  // Debounced category search inside combobox
  useEffect(() => {
    const q = catQuery.trim();
    if (q.length < 2) {
      setCatSuggestions(
        LEADER_CATEGORY_PRESETS.map((name) => ({ id: name, name, box_art_url: null })),
      );
      setCatSearching(false);
      return;
    }
    setCatSearching(true);
    const t = setTimeout(async () => {
      const res = await searchCategories(q);
      setCatSuggestions(res);
      setCatSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [catQuery]);

  // Load ranking when category or language changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      const { category: resolved, channels } = await fetchCategoryLeaders({
        category,
        language,
        limit: 40,
      });
      if (cancelled) return;
      setResolvedCategory(resolved);
      setRows(channels);
      setNotFound(!resolved);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [category, language]);

  // Score Live tab: all rows are live channels (API constraint)
  const filtered = useMemo(() => {
    const sorted = rows.slice().sort(SORT_COMPARATORS[sort]);
    return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [rows, sort]);

  // Category-level stats computed from current filtered list
  const categoryStats = useMemo(() => {
    if (filtered.length === 0) return null;
    const scores = [...filtered].map((c) => c.stream_score).sort((a, b) => a - b);
    const medianScore = scores[Math.floor(scores.length / 2)];
    const viewers = [...filtered]
      .map((c) => c.live_viewer_count ?? 0)
      .sort((a, b) => a - b);
    const medianViewers = viewers[Math.floor(viewers.length / 2)];
    const langCounts: Record<string, number> = {};
    filtered.forEach((c) => {
      if (c.language) langCounts[c.language] = (langCounts[c.language] ?? 0) + 1;
    });
    const dominantLang =
      Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { medianScore, medianViewers, dominantLang };
  }, [filtered]);

  // User's avg viewers from their latest report
  const userAvgViewers = useMemo(() => {
    const v = userReport?.report?.channel_summary?.avg_viewers;
    return typeof v === "number" && v > 0 ? v : null;
  }, [userReport]);

  // Estimated rank: count channels with more live viewers than user's average
  const estimatedRank = useMemo(() => {
    if (!userAvgViewers || filtered.length === 0) return null;
    const above = filtered.filter((c) => (c.live_viewer_count ?? 0) > userAvgViewers).length;
    return Math.min(above + 1, filtered.length + 1);
  }, [filtered, userAvgViewers]);

  const pageMeta = useMemo(
    () => ({
      title: `Classement ${category} — Benchmark Twitch`,
      description: `Découvre les meilleures chaînes Twitch de la catégorie ${category}. Score Live, audience — classés automatiquement.`,
    }),
    [category],
  );
  usePageMeta(pageMeta);

  const pickCategory = (name: string) => {
    setCategory(name);
    setCatQuery("");
    setCatOpen(false);
  };

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Benchmark"
          title="Classements"
          description="Benchmark de catégorie Twitch, avec une vue live à la demande."
        />

        {/* Acquisition CTA for visitors */}
        {!user && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Tu streames dans cette catégorie ?
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Analyse ta chaîne gratuitement et compare-toi à ces streamers.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/">Analyser ma chaîne →</Link>
            </Button>
          </div>
        )}

        {/* ── Score Live: live-only snapshot from /helix/streams ── */}
        <>
            {/* Filters */}
            <Card className="mb-4">
              <CardContent className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
                <div className="col-span-2 lg:col-span-2">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Catégorie Twitch
                  </label>
                  <Popover open={catOpen} onOpenChange={setCatOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={catOpen}
                        className="h-9 w-full justify-between px-3 text-sm font-normal"
                      >
                        <span className="truncate">{category}</span>
                        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      sideOffset={4}
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          value={catQuery}
                          onValueChange={setCatQuery}
                          placeholder="Rechercher une catégorie Twitch…"
                          className="h-9"
                        />
                        <CommandList>
                          {catSearching && (
                            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Recherche en cours…
                            </div>
                          )}
                          {!catSearching && catSuggestions.length === 0 && (
                            <CommandEmpty>Aucune catégorie trouvée</CommandEmpty>
                          )}
                          {!catSearching && catSuggestions.length > 0 && (
                            <CommandGroup
                              heading={catQuery.trim().length < 2 ? "Suggestions" : "Résultats"}
                            >
                              {catSuggestions.map((c) => {
                                const selected = c.name === category;
                                return (
                                  <CommandItem
                                    key={c.id}
                                    value={c.name}
                                    onSelect={() => pickCategory(c.name)}
                                    className="gap-2.5"
                                  >
                                    {c.box_art_url ? (
                                      <img
                                        src={c.box_art_url
                                          .replace("{width}", "40")
                                          .replace("{height}", "54")}
                                        alt=""
                                        className="h-7 w-5 shrink-0 rounded-sm border border-border/60 object-cover"
                                      />
                                    ) : (
                                      <div className="h-7 w-5 shrink-0 rounded-sm border border-border/60 bg-muted" />
                                    )}
                                    <span className="truncate font-medium">{c.name}</span>
                                    <Check
                                      className={cn(
                                        "ml-auto h-3.5 w-3.5 shrink-0 text-primary",
                                        selected ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Langue
                  </label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {LEADER_LANGUAGE_PRESETS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {tab === "live" && (
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tri
                    </label>
                    <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewers">Audience live</SelectItem>
                        <SelectItem value="name">Nom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "streamscore" | "live")} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="streamscore">StreamScore</TabsTrigger>
                <TabsTrigger value="live">Score Live</TabsTrigger>
              </TabsList>

              <TabsContent value="streamscore" className="mt-0">
                <StreamScoreLeaderboard
                  category={category}
                  language={language}
                  isPro={isPro}
                />
              </TabsContent>

              <TabsContent value="live" className="mt-0">
            {/* Category header */}
            {resolvedCategory && !loading && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3">
                {resolvedCategory.box_art_url && (
                  <img
                    src={resolvedCategory.box_art_url
                      .replace("{width}", "60")
                      .replace("{height}", "80")}
                    alt={resolvedCategory.name}
                    className="h-12 w-9 rounded-sm border border-border/60 object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Catégorie
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {resolvedCategory.name}
                  </p>
                </div>
                {categoryStats && (
                  <div className="hidden items-center gap-5 sm:flex">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Score médian</p>
                      <p className="text-sm font-bold text-foreground">{categoryStats.medianScore}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Viewers médian</p>
                      <p className="text-sm font-bold text-foreground">
                        {formatViewers(categoryStats.medianViewers)}
                      </p>
                    </div>
                    {categoryStats.dominantLang && language === "all" && (
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Langue top</p>
                        <p className="text-sm font-bold text-foreground">
                          {categoryStats.dominantLang.toUpperCase()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Personal position banner */}
            {user && userAvgViewers && estimatedRank && !loading && filtered.length > 0 && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  #{estimatedRank}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Ta position estimée dans {category}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Avec {formatViewers(userAvgViewers)} viewers moyens, tu te situerais autour du{" "}
                    <span className="font-semibold text-foreground">#{estimatedRank}</span> sur{" "}
                    {filtered.length} chaînes.{" "}
                    {estimatedRank <= 3
                      ? "Tu es dans le podium de cette catégorie."
                      : estimatedRank <= 10
                        ? `${estimatedRank - 1} chaîne${estimatedRank - 1 > 1 ? "s" : ""} devant toi.`
                        : `${estimatedRank - 1} chaînes devant toi.`}
                  </p>
                </div>
              </div>
            )}

            {/* Results */}
            {loading ? (
              <LoadingState />
            ) : notFound ? (
              <Card>
                <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  Catégorie introuvable sur Twitch. Essaie un autre nom exact (ex: "Grand Theft Auto V").
                </CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col gap-1 p-6 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 text-foreground">
                    <Trophy className="h-4 w-4" />
                    Aucune chaîne live trouvée pour cette catégorie.
                  </p>
                  <p className="pl-6 text-xs">Essaie une autre langue ou une autre catégorie.</p>
                </CardContent>
              </Card>
            ) : (() => {
              const visibleRows = isPro ? filtered : filtered.slice(0, FREE_LEADERS_LIMIT);
              const lockedRows = isPro ? [] : filtered.slice(FREE_LEADERS_LIMIT);

              const renderRow = (c: (typeof filtered)[number], idx: number) => {
                const separatorLabel = TIER_SEPARATORS[idx];
                const signal = getSecondarySignal(c);
                const tier = getTierTheme(getScoreTier(c.stream_score));
                const isPodium = c.rank <= 3;
                return (
                  <React.Fragment key={c.id}>
                    {separatorLabel && (
                      <div className="flex items-center gap-3 py-1">
                        <div className="h-px flex-1 bg-border/40" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                          {separatorLabel}
                        </span>
                        <div className="h-px flex-1 bg-border/40" />
                      </div>
                    )}
                    <Link
                      to={`/streamer/${c.login}`}
                      className={cn(
                        "group flex items-start gap-2 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-card/80 sm:items-center sm:gap-3",
                        c.rank === 1
                          ? "border-primary/25 bg-primary/[0.03]"
                          : "border-border bg-card",
                      )}
                    >
                      <span
                        className={cn(
                          "w-7 shrink-0 text-right text-xs font-bold tabular-nums",
                          c.rank === 1
                            ? "text-primary"
                            : isPodium
                              ? "text-foreground/80"
                              : "text-muted-foreground",
                        )}
                      >
                        #{c.rank}
                      </span>
                      <Avatar className="h-10 w-10 shrink-0 rounded-full border border-border/60">
                        {c.profile_image_url && (
                          <AvatarImage src={c.profile_image_url} alt={c.login} />
                        )}
                        <AvatarFallback className="rounded-full text-[10px]">
                          {c.login.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {c.display_name}
                          </p>
                          {c.is_live && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-destructive">
                              <Radio className="h-2 w-2" /> Live
                            </span>
                          )}
                          {c.language && (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {c.language.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">@{c.login}</span>
                          {c.game_name && (
                            <>
                              <span>·</span>
                              <span className="truncate">{c.game_name}</span>
                            </>
                          )}
                        </div>
                        {signal && (
                          <div className="mt-1.5">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                                SIGNAL_TONE_CLASS[signal.tone],
                              )}
                            >
                              {signal.label}
                            </span>
                          </div>
                        )}

                        {/* Stats — mobile */}
                        <div className="mt-2.5 flex items-center gap-2 sm:hidden">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">viewers</p>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3 text-muted-foreground/40" />
                              <span className="text-sm font-semibold tabular-nums text-foreground">
                                {formatViewers(c.live_viewer_count)}
                              </span>
                            </div>
                          </div>
                          <div className="h-7 w-px bg-border/40" />
                          <div className={cn("flex min-w-[2.75rem] flex-col items-center justify-center rounded-lg border px-2 py-1.5", tier.surfaceClass)}>
                            <span className="text-[9px] font-semibold uppercase tracking-wider opacity-50">score live</span>
                            <span className={cn("text-base font-bold tabular-nums leading-tight", tier.textClass)}>{c.stream_score}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats — desktop */}
                      <div className="hidden shrink-0 items-center gap-2 sm:flex sm:gap-3">
                        <div className="text-right">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">viewers</p>
                          <div className="flex items-center justify-end gap-1">
                            <Eye className="h-3 w-3 text-muted-foreground/40" />
                            <span className="text-sm font-semibold tabular-nums text-foreground">
                              {formatViewers(c.live_viewer_count)}
                            </span>
                          </div>
                        </div>
                        <div className="h-7 w-px bg-border/40" />
                        <div className={cn("flex min-w-[2.75rem] flex-col items-center justify-center rounded-lg border px-2 py-1.5", tier.surfaceClass)}>
                          <span className="text-[9px] font-semibold uppercase tracking-wider opacity-50">score live</span>
                          <span className={cn("text-base font-bold tabular-nums leading-tight", tier.textClass)}>{c.stream_score}</span>
                        </div>
                      </div>

                      <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary sm:block" />
                    </Link>
                  </React.Fragment>
                );
              };

              return (
                <div className="grid gap-2">
                  {visibleRows.map((c, idx) => renderRow(c, idx))}
                  {lockedRows.length > 0 && (
                    <div className="mt-2">
                      <InlineLock
                        feature={`${lockedRows.length} chaîne${lockedRows.length > 1 ? "s" : ""} supplémentaire${lockedRows.length > 1 ? "s" : ""} — Pro`}
                        description="Accède à l'intégralité du classement et compare tous les profils."
                        blurHeight="200px"
                      >
                        <div className="grid gap-2">
                          {lockedRows.map((c, idx) => renderRow(c, FREE_LEADERS_LIMIT + idx))}
                        </div>
                      </InlineLock>
                    </div>
                  )}
                </div>
              );
            })()}

            <p className="mt-6 text-[11px] text-muted-foreground">
              Source : Twitch /streams (snapshot live). Score calculé sur l'audience, le statut broadcaster et la portée en direct.
            </p>
              </TabsContent>
            </Tabs>
          </>
      </PageContainer>
    </AppShell>
  );
};

export default LeadersPage;
