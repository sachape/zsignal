import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Badge } from "@/services/badgeEngine";

interface Props {
  badges: Badge[];
}

const BadgePopover = ({ badge, open, onOpenChange }: {
  badge: Badge;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>
      <button
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border text-base transition-all duration-200 focus:outline-none ${
          badge.unlocked
            ? "border-primary/30 bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.2)] hover:border-primary/50 hover:shadow-[0_0_18px_hsl(var(--primary)/0.3)]"
            : "border-border/30 bg-muted/30 grayscale opacity-50 hover:opacity-70"
        }`}
        title={badge.label}
      >
        <span aria-hidden>{badge.icon}</span>
        {badge.isNew && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-background bg-primary" />
        )}
      </button>
    </PopoverTrigger>
    <PopoverContent side="bottom" align="start" sideOffset={8} className="w-56 p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className={`text-3xl leading-none ${badge.unlocked ? "" : "grayscale opacity-50"}`} aria-hidden>
          {badge.icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{badge.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{badge.description}</p>
        </div>
        <div className="w-full">
          <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Progression</span>
            <span className="tabular-nums font-medium">{badge.progressLabel}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-700 ${badge.unlocked ? "bg-primary" : "bg-muted-foreground/30"}`}
              style={{ width: `${badge.progress}%` }}
            />
          </div>
          {badge.unlocked && (
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Débloqué ✓
            </p>
          )}
        </div>
      </div>
    </PopoverContent>
  </Popover>
);

const BadgeStrip = ({ badges }: Props) => {
  const [openId, setOpenId] = useState<string | null>(null);

  if (badges.length === 0) return null;

  const unlocked = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);
  const newCount = unlocked.filter((b) => b.isNew).length;

  return (
    <div className="flex items-center gap-1.5">
      {/* Unlocked first, then locked */}
      {[...unlocked, ...locked].map((badge) => (
        <BadgePopover
          key={badge.id}
          badge={badge}
          open={openId === badge.id}
          onOpenChange={(v) => setOpenId(v ? badge.id : null)}
        />
      ))}
      <span className="ml-1 text-[10px] text-muted-foreground/50 tabular-nums">
        {unlocked.length}/{badges.length}
      </span>
      {newCount > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-background">
          +{newCount}
        </span>
      )}
    </div>
  );
};

export default BadgeStrip;
