import { useEffect, useMemo, useState } from "react";
import { Sparkles, RefreshCcw, Check, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { generateTitles, type TitleOption } from "@/services/titleGenerator";

interface Props {
  game: string;
  objective: string;
  tone: string;
  audience: string;
  presetLabel?: string | null;
  currentTitle: string;
  lastAppliedTitle: string | null;
  onApply: (title: string) => void;
}

function buildAngle(args: {
  objective: string;
  audience: string;
  tone: string;
  presetLabel?: string | null;
}): string {
  const bits: string[] = [];
  if (args.objective.trim()) bits.push(args.objective.trim());
  else if (args.presetLabel) bits.push(args.presetLabel);
  if (args.audience.trim()) bits.push(args.audience.trim());
  return bits.slice(0, 1).join(" — ");
}

const DEFAULT_VISIBLE = 3;

export default function SuggestedTitles({
  game, objective, tone, audience, presetLabel,
  currentTitle, lastAppliedTitle, onApply,
}: Props) {
  const angle = useMemo(
    () => buildAngle({ objective, audience, tone, presetLabel }),
    [objective, audience, tone, presetLabel],
  );

  const [seed, setSeed] = useState(0);
  const [titles, setTitles] = useState<TitleOption[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const effectiveGame = game.trim() || "Live";
    setTitles(generateTitles(effectiveGame, angle || null, 8));
  }, [game, angle, seed]);

  const hasGame = game.trim().length > 0;
  const manuallyEdited =
    !!lastAppliedTitle &&
    currentTitle.trim().length > 0 &&
    currentTitle.trim() !== lastAppliedTitle.trim();

  const visible = expanded ? titles : titles.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = titles.length - DEFAULT_VISIBLE;

  return (
    <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Titres suggérés
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSeed(s => s + 1)}>
          <RefreshCcw className="mr-1 h-3 w-3" />
          Régénérer
        </Button>
      </div>

      {!hasGame && (
        <p className="text-xs text-muted-foreground">
          Renseigne un jeu ou une catégorie pour générer des suggestions adaptées.
        </p>
      )}

      {manuallyEdited && (
        <div className="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-300">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>Titre modifié manuellement. Ton titre actuel ne sera pas écrasé tant que tu ne cliques pas sur « Utiliser ».</span>
        </div>
      )}

      <ul className="space-y-2">
        {visible.map((t, i) => {
          const isActive = currentTitle.trim() === t.text.trim();
          return (
            <li
              key={`${i}-${t.text}`}
              className={cn(
                "rounded-lg border bg-background/40 p-2.5 transition",
                isActive ? "border-primary/50 bg-primary/8" : "border-border/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground leading-snug">{t.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Score {t.score}</Badge>
                    {t.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="rounded-full border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm" variant={isActive ? "secondary" : "outline"}
                  className="h-7 shrink-0 px-2 text-[11px]"
                  onClick={() => onApply(t.text)} disabled={isActive}
                >
                  {isActive ? <><Check className="mr-1 h-3 w-3" />Sélectionné</> : "Utiliser"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/40 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
        >
          {expanded
            ? <><ChevronUp className="h-3.5 w-3.5" />Voir moins</>
            : <><ChevronDown className="h-3.5 w-3.5" />Voir {hiddenCount} titre{hiddenCount > 1 ? "s" : ""} de plus</>}
        </button>
      )}

      <p className="text-[10px] italic text-muted-foreground/60">
        Sélectionner un titre met à jour Twitch, YouTube, Kick et le post social.
      </p>
    </div>
  );
}
