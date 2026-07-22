import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Sparkles, Trophy, Zap, ArrowRight } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import type { WeeklyQuests, Quest } from "@/services/questEngine";

interface Props {
  weeklyQuests: WeeklyQuests;
  onToggle: (questId: string) => void;
  linkToQuests?: boolean;
}

const QuestRow = ({
  quest,
  onToggle,
}: {
  quest: Quest;
  onToggle: (id: string) => void;
}) => {
  const handleManualClick = () => {
    if (!quest.completed) {
      toast.success(`+${quest.xp} XP`, {
        description: quest.title,
        duration: 2500,
      });
    }
    onToggle(quest.id);
  };

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
          onClick={handleManualClick}
          aria-pressed={quest.completed}
          aria-label={`Marquer "${quest.title}" comme ${quest.completed ? "non fait" : "fait"}`}
          className="mt-0.5 shrink-0 transition-opacity hover:opacity-80"
        >
          {quest.completed ? (
            <CheckCircle2 className="h-4 w-4 text-primary-strong" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/50" />
          )}
        </button>
      ) : (
        <div className="mt-0.5 shrink-0">
          {quest.completed ? (
            <CheckCircle2 className="h-4 w-4 text-primary-strong" />
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
          <span className="ml-auto shrink-0 rounded-full border border-border/40 bg-muted/50 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-muted-foreground">
            +{quest.xp} XP
          </span>
        </div>

        <p className="mt-0.5 text-[12px] text-muted-foreground">{quest.description}</p>

        {/* Quest type indicator */}
        <p className="mt-1 text-[12px] text-muted-foreground/40">
          {quest.type === "verifiable" ? "Vérifié automatiquement" : "À cocher manuellement"}
        </p>

        {/* Progress bar for verifiable quests */}
        {quest.type === "verifiable" && !quest.completed && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${quest.progress}%` }}
              />
            </div>
            <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
              {quest.progressLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

function nextMondayLabel(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntil = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  d.setDate(d.getDate() + daysUntil);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

const NOTIF_KEY = (userId?: string) => userId ? `quetes_new_${userId}` : null;
const NOTIF_EVENT = "quetes-notif-update";

export function setQuestesNotification(userId: string): void {
  try { localStorage.setItem(`quetes_new_${userId}`, "1"); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(NOTIF_EVENT));
}

export function clearQuestesNotification(userId: string): void {
  try { localStorage.removeItem(`quetes_new_${userId}`); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(NOTIF_EVENT));
}

export function hasQuestesNotification(userId: string): boolean {
  try { return localStorage.getItem(`quetes_new_${userId}`) === "1"; } catch { return false; }
}

void NOTIF_KEY; // suppress unused warning

const WeeklyQuestCard = ({ weeklyQuests, onToggle, linkToQuests = false }: Props) => {
  const { quests, allCompleted, weekKey } = weeklyQuests;
  const prevAllCompleted = useRef(allCompleted);

  useEffect(() => {
    if (allCompleted && !prevAllCompleted.current) {
      toast.success("Semaine parfaite ! 🔥", {
        description: "Toutes tes quêtes complétées — reviens lundi pour la suite.",
        duration: 4000,
      });
    }
    prevAllCompleted.current = allCompleted;
  }, [allCompleted]);

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
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-xl">
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
            <Zap className="h-4 w-4 text-primary-strong" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">Quêtes de la semaine</h2>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{weekLabel}</p>
        </div>

        {/* Progress summary */}
        <div className="flex shrink-0 items-center gap-2">
          {totalXp > 0 && (
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[12px] font-semibold text-primary-strong">
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
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-primary/[0.06] p-5">
          {/* Background glow */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl"
            style={{ background: "hsl(var(--primary) / 0.18)" }}
            aria-hidden
          />

          {/* Header */}
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                <Trophy className="h-5 w-5 text-primary-strong" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Semaine parfaite !</p>
                <p className="text-[12px] text-muted-foreground">
                  Reviens {nextMondayLabel()} pour la suite
                </p>
              </div>
            </div>
            {/* XP total */}
            <div className="shrink-0 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-center">
              <p className="text-base font-bold tabular-nums text-primary-strong leading-none">+{totalXp}</p>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-primary-strong/70">XP</p>
            </div>
          </div>

          {/* Completed quest list */}
          <div className="relative mt-4 space-y-1.5">
            {quests.map((q) => (
              <div key={q.id} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary-strong/60" aria-hidden />
                <span className="flex-1 text-[12px] text-muted-foreground line-through">{q.title}</span>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-primary-strong/60">+{q.xp} XP</span>
              </div>
            ))}
          </div>

          {/* Sparkles decoration */}
          <Sparkles className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 text-primary-strong/20" aria-hidden />
        </div>
      ) : (
        <div className="relative space-y-2">
          {quests.map((q) => (
            <QuestRow key={q.id} quest={q} onToggle={onToggle} />
          ))}
        </div>
      )}

      {linkToQuests && (
        <div className="relative mt-3 border-t border-border/30 pt-3">
          <Link
            to="/quetes"
            className="flex items-center justify-between text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Badges, XP et progression complète</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default WeeklyQuestCard;
