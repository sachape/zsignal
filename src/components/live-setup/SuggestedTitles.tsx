// Suggested titles block for Live Setup. Wraps the existing title generator
// engine so users no longer need to leave Live Setup to craft a title.
//
// Inputs are derived from the Live Setup form (game, objective, tone, audience,
// language, preset). Clicking "Utiliser ce titre" sets `input.titleRaw`, which
// flows through the existing metadata regeneration pipeline (Twitch / YouTube
// / Kick / Social).

import { useEffect, useMemo, useState } from "react";
import { Sparkles, RefreshCcw, Check, AlertCircle } from "lucide-react";
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
  /** Last title the user actively picked from this block, if any. */
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
  // Tone is structural enough to influence emoji/phrase choice but not the
  // angle phrase itself — keep angle short to avoid bloated titles.
  return bits.slice(0, 1).join(" — ");
}

export default function SuggestedTitles({
  game,
  objective,
  tone,
  audience,
  presetLabel,
  currentTitle,
  lastAppliedTitle,
  onApply,
}: Props) {
  const angle = useMemo(
    () => buildAngle({ objective, audience, tone, presetLabel }),
    [objective, audience, tone, presetLabel],
  );

  // seed bumps to force a regeneration (titleGenerator shuffles internally).
  const [seed, setSeed] = useState(0);
  const [titles, setTitles] = useState<TitleOption[]>([]);

  // Recompute when any structural input changes.
  useEffect(() => {
    const effectiveGame = game.trim() || "Live";
    setTitles(generateTitles(effectiveGame, angle || null, 6));
  }, [game, angle, seed]);

  const hasGame = game.trim().length > 0;
  const manuallyEdited =
    !!lastAppliedTitle &&
    currentTitle.trim().length > 0 &&
    currentTitle.trim() !== lastAppliedTitle.trim();

  return (
    <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Titres suggérés
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => setSeed(s => s + 1)}
        >
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
        <div className="flex items-start gap-1.5 rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-300">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Titre modifié manuellement. Tu peux régénérer ou choisir une nouvelle suggestion ci-dessous —
            ton titre actuel ne sera pas écrasé tant que tu ne cliques pas sur « Utiliser ».
          </span>
        </div>
      )}

      <ul className="space-y-2">
        {titles.map((t, i) => {
          const isActive = currentTitle.trim() === t.text.trim();
          return (
            <li
              key={`${i}-${t.text}`}
              className={cn(
                "rounded-md border bg-background/40 p-2 transition",
                isActive ? "border-primary/60 bg-primary/10" : "border-border/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground">{t.text}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      Score {t.score}
                    </Badge>
                    {t.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? "secondary" : "outline"}
                  className="h-7 shrink-0 px-2 text-[11px]"
                  onClick={() => onApply(t.text)}
                  disabled={isActive}
                >
                  {isActive
                    ? <><Check className="mr-1 h-3 w-3" /> Sélectionné</>
                    : "Utiliser ce titre"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-[10px] italic text-muted-foreground/80">
        Sélectionner un titre met à jour le titre Twitch, YouTube, Kick et le post social
        en conservant ton historique de push.
      </p>
    </div>
  );
}
