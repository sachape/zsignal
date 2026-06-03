import { useEffect, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  NICHE_SUGGESTIONS,
  setPreferredNiche,
  getPreferredNiche,
} from "@/services/preferredNiche";
import { fetchCategoryLeaders, fetchCategoriesBoxArt, type LeaderCategory } from "@/services/leadersService";

interface Props {
  userId: string | null | undefined;
  defaultLanguage?: string;
  onChange?: (category: string) => void;
}

const COUNT_LIMIT = 50;

const NicheChooser = ({ userId, defaultLanguage = "fr", onChange }: Props) => {
  const initial = getPreferredNiche(userId);
  const [selected, setSelected] = useState<string | null>(
    initial?.category ?? null,
  );
  const [custom, setCustom] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [boxArt, setBoxArt] = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetchCategoriesBoxArt(NICHE_SUGGESTIONS.map(n => n.category)).then(cats => {
      const map: Record<string, string | null> = {};
      cats.forEach((c: LeaderCategory) => { map[c.name] = c.box_art_url; });
      setBoxArt(map);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async (n: (typeof NICHE_SUGGESTIONS)[0]) => {
      try {
        const { channels } = await fetchCategoryLeaders({
          category: n.category,
          limit: COUNT_LIMIT,
          language: "all",
        });
        if (!cancelled) {
          setCounts((prev) => ({ ...prev, [n.category]: channels.length }));
        }
      } catch {
        // ignore failed count fetches
      }
    };
    NICHE_SUGGESTIONS.forEach((n) => fetchCount(n));
    return () => {
      cancelled = true;
    };
  }, [defaultLanguage]);

  const apply = (cat: string) => {
    if (!cat.trim()) return;
    setPreferredNiche(userId, cat.trim(), defaultLanguage);
    setSelected(cat.trim());
    onChange?.(cat.trim());
  };

  return (
    <Card className="mb-6 border-border/70 bg-card/40">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">
            Choisir ma niche de référence
          </p>
          {selected && (
            <Badge variant="outline" className="text-[10px] text-primary">
              Niche : {selected}
            </Badge>
          )}
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Sélectionne une catégorie pour explorer ses leaders et mécaniques.
          Cela rend le benchmark intentionnel plutôt qu'aléatoire.
        </p>
        <div className="flex flex-wrap gap-2">
          {NICHE_SUGGESTIONS.map((n) => {
            const active = selected === n.category;
            const count = counts[n.category];
            return (
              <Button
                key={n.category}
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => apply(n.category)}
                className="h-8 gap-1.5 text-xs"
              >
                {active && <Check className="h-3 w-3 shrink-0" />}
                {boxArt[n.category] ? (
                  <img
                    src={boxArt[n.category]!.replace("{width}", "30").replace("{height}", "40")}
                    alt=""
                    className="h-4 w-3 shrink-0 rounded-[2px] object-cover"
                  />
                ) : null}
                {n.label}
                {count !== undefined && (
                  <span
                    className={cn(
                      "ml-1.5 tabular-nums text-[10px]",
                      active ? "opacity-75" : "opacity-50",
                    )}
                  >
                    {count >= COUNT_LIMIT ? `${COUNT_LIMIT}+` : count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            placeholder="Ou saisis ta catégorie (ex. Speedrunning)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") apply(custom);
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => apply(custom)}
            disabled={!custom.trim()}
            className="h-8 shrink-0 text-xs"
          >
            Appliquer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NicheChooser;
