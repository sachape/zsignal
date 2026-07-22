import { useState } from "react";
import { Check, Copy, Sparkles, Zap } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { generateTitles, SUPPORTED_GAMES, type TitleOption } from "@/services/titleGenerator";
import { usePageMeta } from "@/hooks/usePageMeta";

const ALL_GAMES = ["Just Chatting", ...SUPPORTED_GAMES.filter((g) => g !== "Just Chatting")];

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500" : score >= 65 ? "bg-primary" : "bg-warning";
  const label =
    score >= 80 ? "Fort" : score >= 65 ? "Bon" : "Moyen";
  const labelColor =
    score >= 80 ? "text-emerald-400" : score >= 65 ? "text-primary-strong" : "text-warning";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn("text-[12px] font-semibold tabular-nums", labelColor)}>
        {score}/100 · {label}
      </span>
    </div>
  );
}

function TitleCard({ option, rank }: { option: TitleOption; rank: number }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(option.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      className={cn(
        "group transition-all duration-200 hover:border-border/80",
        rank === 0 && "border-primary/40 bg-primary/5",
      )}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/60 text-xs font-bold text-muted-foreground">
          {rank + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground">{option.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ScoreBar score={option.score} />
            {option.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-border/50 bg-muted/30 px-1.5 py-0 text-[12px] text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={copy}
          title="Copier"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

const TitleGeneratorPage = () => {
  usePageMeta({ title: "Générateur de titres — Streamnco" });

  const [game, setGame] = useState("Valorant");
  const [angle, setAngle] = useState("");
  const [titles, setTitles] = useState<TitleOption[]>([]);
  const [generated, setGenerated] = useState(false);

  const generate = () => {
    setTitles(generateTitles(game, angle || null, 8));
    setGenerated(true);
  };

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Outils"
          title="Générateur de titres"
          description="Crée 5 titres optimisés pour ton prochain live en 1 clic."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
          {/* Input panel */}
          <div className="space-y-5">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Jeu / Catégorie
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {ALL_GAMES.map((g) => (
                      <button
                        key={g}
                        onClick={() => setGame(g)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-all",
                          game === g
                            ? "border-primary/50 bg-primary/10 text-primary-strong"
                            : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground",
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Angle / Contexte <span className="font-normal normal-case">(optionnel)</span>
                  </label>
                  <Input
                    placeholder="ex. push Diamond, session détente, avec viewers…"
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && generate()}
                    className="h-9 text-sm"
                  />
                </div>

                <Button onClick={generate} className="w-full gap-2">
                  <Sparkles className="h-4 w-4" />
                  Générer les titres
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-muted/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-2.5">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Astuce</p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      Un bon titre = catégorie claire + intention + emoji.
                      Évite les titres génériques type "Gaming" ou "Stream du soir".
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="space-y-2.5">
            {!generated ? (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/40">
                <div className="text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Choisis un jeu et génère tes titres
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-0.5 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {titles.length} titres générés pour {game}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generate}
                    className="h-7 gap-1.5 px-2.5 text-xs"
                  >
                    <Sparkles className="h-3 w-3" />
                    Regénérer
                  </Button>
                </div>
                {titles.map((t, i) => (
                  <TitleCard key={i} option={t} rank={i} />
                ))}
              </>
            )}
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default TitleGeneratorPage;
