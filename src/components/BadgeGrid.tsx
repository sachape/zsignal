import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Badge } from "@/services/badgeEngine";

interface Props {
  badges: Badge[];
}

const BadgeCell = ({ badge }: { badge: Badge }) => {
  return (
    <div
      className={`relative flex flex-col items-center gap-2.5 rounded-xl border p-4 text-center transition-all duration-200 ${
        badge.unlocked
          ? "border-primary/20 bg-primary/[0.04] hover:border-primary/35 hover:bg-primary/[0.07]"
          : "border-border/30 bg-muted/20 opacity-50"
      }`}
    >
      {/* "Nouveau !" chip */}
      {badge.isNew && (
        <span className="absolute -right-1.5 -top-1.5 rounded-full border border-primary/30 bg-primary px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-background">
          Nouveau !
        </span>
      )}

      {/* Icon */}
      <span
        className={`text-2xl leading-none ${badge.unlocked ? "" : "grayscale"}`}
        aria-hidden
      >
        {badge.icon}
      </span>

      {/* Label */}
      <p
        className={`text-[12px] font-semibold leading-tight ${
          badge.unlocked ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {badge.label}
      </p>

      {/* Progress bar (locked) or check (unlocked) */}
      {badge.unlocked ? (
        <span className="text-[12px] font-semibold uppercase tracking-wider text-primary-strong">
          Débloqué
        </span>
      ) : (
        <div className="w-full">
          <div className="mb-0.5 text-[12px] tabular-nums text-muted-foreground/60">
            {badge.progressLabel}
          </div>
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-muted-foreground/30 transition-all duration-700"
              style={{ width: `${badge.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const BadgeGrid = ({ badges }: Props) => {
  const [showLocked, setShowLocked] = useState(false);

  const unlocked = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);
  const newCount = unlocked.filter((b) => b.isNew).length;

  if (badges.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Badges</h2>
          {newCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[12px] font-bold text-background">
              +{newCount} nouveau{newCount > 1 ? "x" : ""}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {unlocked.length}/{badges.length}
          </span>
        </div>
        {locked.length > 0 && (
          <button
            onClick={() => setShowLocked((s) => !s)}
            className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
          >
            {showLocked ? (
              <>
                Masquer <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Voir tout <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Unlocked badges */}
      {unlocked.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {unlocked.map((b) => (
            <BadgeCell key={b.id} badge={b} />
          ))}
          {showLocked &&
            locked.map((b) => <BadgeCell key={b.id} badge={b} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-border/30 bg-muted/20 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun badge débloqué pour l'instant.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/60">
            Continue à streamer régulièrement pour les débloquer.
          </p>
          {showLocked && locked.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3">
              {locked.map((b) => (
                <BadgeCell key={b.id} badge={b} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BadgeGrid;
