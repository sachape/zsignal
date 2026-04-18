import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Loader2, Radio, Search, Trophy } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/StateView";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchCategoryLeaders,
  searchCategories,
  LEADER_CATEGORY_PRESETS,
  LEADER_LANGUAGE_PRESETS,
  type LeaderChannel,
  type LeaderCategory,
} from "@/services/leadersService";

type SortKey = "viewers" | "score" | "name";
type LiveFilter = "all" | "live";

const formatViewers = (n: number | null): string => {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
};

const scoreColor = (s: number): string => {
  if (s >= 75) return "text-primary";
  if (s >= 55) return "text-foreground";
  if (s >= 35) return "text-muted-foreground";
  return "text-muted-foreground/70";
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
  // Selected canonical category (name only — backend resolves to game_id).
  const [category, setCategory] = useState<string>("Just Chatting");
  const [language, setLanguage] = useState<string>("all");
  const [liveFilter, setLiveFilter] = useState<LiveFilter>("all");
  const [sort, setSort] = useState<SortKey>("viewers");

  // Category autocomplete state.
  const [catQuery, setCatQuery] = useState<string>("");
  const [catSuggestions, setCatSuggestions] = useState<LeaderCategory[]>([]);
  const [catSearching, setCatSearching] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const suggestRef = useRef<HTMLDivElement | null>(null);

  // Ranking data.
  const [rows, setRows] = useState<LeaderChannel[]>([]);
  const [resolvedCategory, setResolvedCategory] = useState<LeaderCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Debounced category autocomplete.
  useEffect(() => {
    if (catQuery.trim().length < 2) {
      setCatSuggestions([]);
      return;
    }
    setCatSearching(true);
    const t = setTimeout(async () => {
      const res = await searchCategories(catQuery);
      setCatSuggestions(res);
      setCatSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [catQuery]);

  // Close suggestion popover on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!suggestRef.current?.contains(e.target as Node)) setShowSuggest(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
    let out = rows.slice();
    if (liveFilter === "live") out = out.filter((r) => r.is_live);

    switch (sort) {
      case "viewers":
        out.sort((a, b) => (b.live_viewer_count ?? 0) - (a.live_viewer_count ?? 0));
        break;
      case "score":
        out.sort((a, b) => b.stream_score - a.stream_score);
        break;
      case "name":
        out.sort((a, b) => a.display_name.localeCompare(b.display_name));
        break;
    }
    // Re-rank after sort for visual rank column.
    return out.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [rows, liveFilter, sort]);

  const pickCategory = (name: string) => {
    setCategory(name);
    setCatQuery("");
    setShowSuggest(false);
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
          <Link to="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" /> Tableau de bord
          </Link>
        </Button>

        <PageHeader
          eyebrow="Benchmark"
          title="Classements"
          description="Le vrai classement live d'une catégorie Twitch — qui domine, qui monte, qui mérite d'être inspecté."
        />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2" ref={suggestRef}>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Catégorie Twitch
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={catQuery}
                  onChange={(e) => {
                    setCatQuery(e.target.value);
                    setShowSuggest(true);
                  }}
                  onFocus={() => setShowSuggest(true)}
                  placeholder={category}
                  className="h-9 pl-8 text-sm"
                />
                {catSearching && (
                  <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {showSuggest && (catQuery.length >= 2 || catSuggestions.length > 0) && (
                  <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                    {catSuggestions.length === 0 && !catSearching && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Aucune catégorie trouvée
                      </div>
                    )}
                    {catSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickCategory(c.name)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-secondary"
                      >
                        {c.box_art_url && (
                          <img
                            src={c.box_art_url
                              .replace("{width}", "40")
                              .replace("{height}", "54")}
                            alt={c.name}
                            className="h-7 w-5 rounded-sm border border-border/60 object-cover"
                          />
                        )}
                        <span className="truncate font-medium text-foreground">
                          {c.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LEADER_CATEGORY_PRESETS.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pickCategory(c)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                      category === c
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
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
                État
              </label>
              <Select
                value={liveFilter}
                onValueChange={(v) => setLiveFilter(v as LiveFilter)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="live">Live uniquement</SelectItem>
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
                  <SelectItem value="viewers">Audience live</SelectItem>
                  <SelectItem value="score">StreamScore</SelectItem>
                  <SelectItem value="name">Nom</SelectItem>
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
                Chaînes live
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
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4" />
              Aucune chaîne live ne correspond à ces filtres.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to={`/streamer/${c.login}`}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-card/80"
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

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {c.display_name}
                    </p>
                    {c.is_live && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-destructive">
                        <Radio className="h-2 w-2" /> Live
                      </span>
                    )}
                    {c.language && (
                      <Badge variant="outline" className="text-[10px]">
                        {c.language.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">@{c.login}</span>
                    {c.game_name && (
                      <>
                        <span>·</span>
                        <span className="truncate">{c.game_name}</span>
                      </>
                    )}
                  </div>
                  {c.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live viewers */}
                <div className="hidden text-right sm:block">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Live
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatViewers(c.live_viewer_count)}
                  </p>
                </div>

                {/* StreamScore */}
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Score
                  </p>
                  <p
                    className={`text-sm font-semibold tabular-nums ${scoreColor(c.stream_score)}`}
                  >
                    {c.stream_score}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" />
              </Link>
            ))}
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
