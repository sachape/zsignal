import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkX, ExternalLink, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  getWatchlist,
  removeFromWatchlist,
  type WatchlistEntry,
} from "@/services/benchmarkWatchlist";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "Il y a 1 semaine";
  if (weeks < 5) return `Il y a ${weeks} semaines`;
  return `Il y a ${Math.floor(days / 30)} mois`;
}

const WatchlistPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    setEntries(getWatchlist(user?.id ?? null));
    const sync = () => setEntries(getWatchlist(user?.id ?? null));
    window.addEventListener("streampulse:watchlist-changed", sync);
    return () => window.removeEventListener("streampulse:watchlist-changed", sync);
  }, [user?.id]);

  const remove = (login: string) => {
    removeFromWatchlist(user?.id ?? null, login);
  };

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Benchmark"
          title="Watchlist"
          description={null}
        />

        {entries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Bookmark className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Aucun profil suivi</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Clique sur l'icône bookmark sur un profil streamer pour l'ajouter ici.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/leaders">Explorer les classements</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <p className="mb-4 text-xs text-muted-foreground">
              {entries.length} profil{entries.length > 1 ? "s" : ""} suivi{entries.length > 1 ? "s" : ""}
            </p>
            {entries.map((entry) => (
              <Card
                key={entry.login}
                className="border-border/60 bg-card/60 transition-colors hover:border-primary/20 hover:bg-card/80"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                    {entry.display_name[0]?.toUpperCase() ?? "?"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {entry.display_name}
                      </span>
                      {entry.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {entry.category}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {timeAgo(entry.added_at)} · @{entry.login}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button asChild size="sm" variant="outline" className="h-8 px-3 text-xs">
                      <Link to={`/streamer/${entry.login}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Voir le profil
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Retirer de la watchlist"
                      onClick={() => remove(entry.login)}
                    >
                      <BookmarkX className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          <Sparkles className="inline h-3 w-3 mr-1" />
          La watchlist est stockée localement sur ton appareil. Elle ne synchronise pas entre appareils.
        </p>
      </PageContainer>
    </AppShell>
  );
};

export default WatchlistPage;
