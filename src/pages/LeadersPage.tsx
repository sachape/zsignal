import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, ChevronRight, ChevronsUpDown, Loader2, Radio, Trophy } from "lucide-react";
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

type ViewMode = "all" | "live";
type SortKey = "viewers" | "score" | "name";

/**
 * Centralized sort map. The comparator selected here is the ONLY thing
 * that decides row order — so the UI label and the displayed order can
 * never drift apart again.
 *  - score   → StreamScore desc
 *  - viewers → live audience desc (null treated as 0)
 *  - name    → display name asc (locale-aware)
 */
const SORT_COMPARATORS: Record<SortKey, (a: LeaderChannel, b: LeaderChannel) => number> = {
  score: (a, b) => b.stream_score - a.stream_score,
  viewers: (a, b) => (b.live_viewer_count ?? 0) - (a.live_viewer_count ?? 0),
  name: (a, b) => a.display_name.localeCompare(b.display_name),
};

const formatViewers = (n: number | null): string => {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
};

/** Single secondary signal per row, mode-aware. Returns null if nothing notable. */
function getSecondarySignal(
  c: LeaderChannel,
  view: ViewMode,
): { label: string; tone: "primary" | "warning" | "muted" | "destructive" } | null {
  if (view === "live") {
    const v = c.live_viewer_count ?? 0;
    if (v >= 2000) return { label: "Très regardé", tone: "destructive" };
    if (c.stream_score >= 80) return { label: "Bon score live", tone: "primary" };
    if (v >= 300) return { label: "En direct", tone: "warning" };
    return { label: "À inspecter", tone: "muted" };
  }
  // All channels view → benchmark framing
  if (c.stream_score >= 80) return { label: "Base solide", tone: "primary" };
  if ((c.live_viewer_count ?? 0) >= 1000) return { label: "Forte audience", tone: "warning" };
  if (c.stream_score >= 55) return { label: "Bon score", tone: "muted" };
  return { label: "À observer", tone: "muted" };
}

const SIGNAL_TONE_CLASS: Record<"primary" | "warning" | "muted" | "destructive", string> = {
  primary: "border-primary/30 bg-primary/10 text-primary",
  warning: "border-warning/30 bg-warning/10 text-warning",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted/40 text-muted-foreground",
};

/**
 * Classements (Benchmark > Rankings).
 *
 * Real backend flow:
 *   1. Category resolution → /helix/games?name=  (canonical game_id)
 *   2. /helix/streams?game_id=...   (real live channels in that category)
 *   3. /helix/users batch          (avatars + broadcaster_type)
 * Each row enriched client-side with a teaser StreamScore + benchmark tags.
 */
const LeadersPage = () => {
  const { user } = useAuth();

  // Selected canonical category (name only — backend resolves to game_id).
  const [category, setCategory] = useState<string>("Just Chatting");
  const [language, setLanguage] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("all");
  const [sort, setSort] = useState<SortKey>("score");

  // Category combobox state.
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState<string>("");
  const [catSuggestions, setCatSuggestions] = useState<LeaderCategory[]>([]);
  const [catSearching, setCatSearching] = useState(false);

  // Ranking data.
  const [rows, setRows] = useState<LeaderChannel[]>([]);
  const [resolvedCategory, setResolvedCategory] = useState<LeaderCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Debounced category search inside the combobox.
  // Below the threshold we surface curated presets so the dropdown isn't empty.
  useEffect(() => {
    const q = catQuery.trim();
    if (q.length < 2) {
      setCatSuggestions(LEADER_CATEGORY_PRESETS.map((name) => ({ id: name, name, box_art_url: null })));
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

  // Load ranking when category or language changes.
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

  const filtered = useMemo(() => {
    // 1. Start from raw data
    // 2. Apply active view (filter)
    // 3. Apply selected sort via the centralized comparator map
    // 4. Re-rank for the visual rank column
    const viewFiltered =
      view === "live" ? rows.filter((r) => r.is_live) : rows.slice();

    const sorted = viewFiltered.sort(SORT_COMPARATORS[sort]);

    return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [rows, view, sort]);

  const pageMeta = useMemo(() => ({
    title: `Classement ${category} — Benchmark Twitch`,
    description: `Découvre les meilleures chaînes Twitch de la catégorie ${category}. StreamScore, audience, clips — classés automatiquement par Streamnco.`,
  }), [category]);
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

        {/* Acquisition CTA — visitors without an account */}
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

        {/* View switcher — primary control: it changes the meaning of the page,
            not just a secondary attribute. Sits above the standard filters. */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Vue"
            className="inline-flex rounded-lg border border-border bg-card p-1"
          >
            {(["all", "live"] as const).map((v) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "all" ? "Toutes les chaînes" : "Live uniquement"}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {view === "all"
              ? "Classe les chaînes d'une catégorie."
              : "Ce qui mérite d'être observé maintenant."}
          </p>
        </div>

        {/* Secondary filters */}
        <Card className="mb-6">
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

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tri
              </label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {view === "live" ? (
                    <>
                      <SelectItem value="viewers">Audience live</SelectItem>
                      <SelectItem value="score">StreamScore</SelectItem>
                      <SelectItem value="name">Nom</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="score">StreamScore</SelectItem>
                      <SelectItem value="viewers">Audience</SelectItem>
                      <SelectItem value="name">Nom</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Resolved category header */}
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
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {view === "live" ? "Chaînes live" : "Chaînes classées"}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {filtered.length}
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
                {view === "live"
                  ? "Aucune chaîne live trouvée pour cette catégorie."
                  : "Aucune chaîne trouvée pour cette catégorie."}
              </p>
              <p className="pl-6 text-xs">Essaie une autre langue ou une autre catégorie.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {filtered.map((c) => {
              const signal = getSecondarySignal(c, view);
              const tier = getTierTheme(getScoreTier(c.stream_score));
              return (
                <Link
                  key={c.id}
                  to={`/streamer/${c.login}`}
                  className="group flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-card/80 sm:gap-3"
                >
                  <span className="w-7 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                    #{c.rank}
                  </span>
                  <Avatar className="h-10 w-10 rounded-full border border-border/60">
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
                      {c.is_live && view === "all" && (
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
                  </div>

                  {/* Right stats — stacked single column, always visible */}
                  <div className="shrink-0 text-right">
                    {(view === "live" || c.is_live) && (
                      <p className="text-xs font-semibold tabular-nums text-muted-foreground">
                        {formatViewers(c.live_viewer_count)}
                      </p>
                    )}
                    <p className={cn("text-sm font-bold tabular-nums", tier.textClass)}>
                      {c.stream_score}
                    </p>
                  </div>
                  <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary sm:block" />
                </Link>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-[11px] text-muted-foreground">
          Source : Twitch /games + /streams (données publiques live).
          StreamScore = estimation basée sur audience live, statut, portée et momentum.
        </p>
      </PageContainer>
    </AppShell>
  );
};

export default LeadersPage;
