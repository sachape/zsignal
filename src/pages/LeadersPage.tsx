import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Radio, Search, Trophy } from "lucide-react";
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
  fetchLeaders,
  LEADER_CATEGORY_PRESETS,
  LEADER_LANGUAGE_PRESETS,
  type LeaderChannel,
} from "@/services/leadersService";

type SortKey = "audience" | "live" | "name";
type LiveFilter = "all" | "live" | "offline";

const LeadersPage = () => {
  const [category, setCategory] = useState<string>("Just Chatting");
  const [language, setLanguage] = useState<string>("all");
  const [liveFilter, setLiveFilter] = useState<LiveFilter>("all");
  const [sort, setSort] = useState<SortKey>("audience");
  const [query, setQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [rows, setRows] = useState<LeaderChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const data = await fetchLeaders({
        category,
        query: debouncedQuery || category,
      });
      if (!cancelled) {
        setRows(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, debouncedQuery]);

  const filtered = useMemo(() => {
    let out = rows.slice();
    if (language !== "all") {
      out = out.filter((r) => (r.language ?? "").toLowerCase() === language);
    }
    if (liveFilter === "live") out = out.filter((r) => r.is_live);
    if (liveFilter === "offline") out = out.filter((r) => !r.is_live);

    switch (sort) {
      case "audience":
        out.sort(
          (a, b) =>
            (b.live_viewer_count ?? (b.is_live ? 1 : 0)) -
            (a.live_viewer_count ?? (a.is_live ? 1 : 0)),
        );
        break;
      case "live":
        out.sort((a, b) => Number(b.is_live) - Number(a.is_live));
        break;
      case "name":
        out.sort((a, b) => a.display_name.localeCompare(b.display_name));
        break;
    }
    return out;
  }, [rows, language, liveFilter, sort]);

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
          description="Explore ta niche, repère les leaders, identifie ce qui marche maintenant."
        />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recherche libre
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Catégorie ou nom de chaîne…"
                  className="h-9 pl-7 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Catégorie
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEADER_CATEGORY_PRESETS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  État
                </label>
                <Select value={liveFilter} onValueChange={(v) => setLiveFilter(v as LiveFilter)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
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
                    <SelectItem value="audience">Audience récente</SelectItem>
                    <SelectItem value="live">Live d'abord</SelectItem>
                    <SelectItem value="name">Nom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4" />
              Aucune chaîne ne correspond à ces filtres. Essaye une autre
              catégorie ou élargis le filtre langue.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((c, i) => (
              <Link
                key={c.id}
                to={`/streamer/${c.login}`}
                className="block rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-card/80"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <Avatar className="h-9 w-9 rounded-md border border-border/60">
                    {c.thumbnail_url && (
                      <AvatarImage src={c.thumbnail_url} alt={c.login} />
                    )}
                    <AvatarFallback className="rounded-md text-[10px]">
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
                    <p className="truncate text-xs text-muted-foreground">
                      @{c.login}
                      {c.game_name ? ` · ${c.game_name}` : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="mt-6 text-[11px] text-muted-foreground">
          Source : Twitch Search Channels (données publiques). Utilise cette vue
          pour repérer des inspirations, pas comme une métrique exacte.
        </p>
      </PageContainer>
    </AppShell>
  );
};

export default LeadersPage;
