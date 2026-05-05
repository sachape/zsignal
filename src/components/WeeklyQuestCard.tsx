import { CheckCircle2, Circle, Sparkles, Zap } from "lucide-react";
import type { WeeklyQuests, Quest } from "@/services/questEngine";

interface Props {
  weeklyQuests: WeeklyQuests;
  onToggle: (questId: string) => void;
}

const QuestRow = ({
  quest,
  onToggle,
}: {
  quest: Quest;
  onToggle: (id: string) => void;
}) => {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition-all duration-200 ${
        quest.completed
          ? "border-primary/20 bg-primary/[0.04]"
          : "border-border/40 bg-transparent hover:border-border/70 hover:bg-muted/20"
      }`}
    >
      {/* Icon / checkbox */}
      {quest.type === "manual" ? (
        <button
          onClick={() => onToggle(quest.id)}
          aria-pressed={quest.completed}
          aria-label={`Marquer "${quest.title}" comme ${quest.completed ? "non fait" : "fait"}`}
          className="mt-0.5 shrink-0 transition-opacity hover:opacity-80"
        >
          {quest.completed ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/50" />
          )}
        </button>
      ) : (
        <div className="mt-0.5 shrink-0">
          {quest.completed ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/30" />
          )}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none" aria-hidden>
            {quest.icon}
          </span>
          <p
            className={`text-sm font-semibold leading-tight ${
              quest.completed ? "text-foreground line-through opacity-60" : "text-foreground"
            }`}
          >
            {quest.title}
          </p>
          {/* XP badge */}
          <span className="ml-auto shrink-0 rounded-full border border-border/40 bg-muted/50 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-muted-foreground">
            +{quest.xp} XP
          </span>
        </div>

        <p className="mt-0.5 text-[11px] text-muted-foreground">{quest.description}</p>

        {/* Progress bar for verifiable quests */}
        {quest.type === "verifiable" && !quest.completed && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${quest.progress}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {quest.progressLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const WeeklyQuestCard = ({ weeklyQuests, onToggle }: Props) => {
  const { quests, allCompleted, weekKey } = weeklyQuests;

  // Format weekKey "2026-04-27" → "Semaine du 27 avr."
  const weekLabel = (() => {
    try {
      const d = new Date(weekKey + "T12:00:00");
      return `Sem. du ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
    } catch {
      return "Cette semaine";
    }
  })();

  const completedCount = quests.filter((q) => q.completed).length;
  const totalXp = quests.reduce((sum, q) => sum + (q.completed ? q.xp : 0), 0);

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-5 backdrop-blur-xl">
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.06)" }}
        aria-hidden
      />

      {/* Header */}
      <div className="relative mb-4 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">Quêtes de la semaine</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{weekLabel}</p>
        </div>

        {/* Progress summary */}
        <div className="flex shrink-0 items-center gap-2">
          {totalXp > 0 && (
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              +{totalXp} XP
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {completedCount}/{quests.length}
          </span>
        </div>
      </div>

      {/* All completed celebration */}
      {allCompleted ? (
        <div className="relative rounded-xl border border-primary/25 bg-primary/[0.07] p-4 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Semaine parfaite !</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Toutes les quêtes complétées — reviens lundi pour la suite.
          </p>
        </div>
      ) : (
        <div className="relative space-y-2">
          {quests.map((q) => (
            <QuestRow key={q.id} quest={q} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
};

export default WeeklyQuestCard;
