import { useState } from "react";
import { Link } from "react-router-dom";
import { Clapperboard, Palette, Coins, Sparkles } from "lucide-react";
import { useQuotaUsage } from "@/hooks/useQuotaUsage";
import { useCreditPackages } from "@/hooks/useCreditPackages";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { normalizePlan } from "@/lib/planAccess";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CreationCapacityDialog } from "@/components/CreationCapacityDialog";
import { cn } from "@/lib/utils";

const PLAN_LABEL: Record<string, string> = {
  free: "Gratuit",
  pro: "Pro",
  growth: "Growth",
  agency: "Agency",
};

type LineState = "ok" | "warn" | "limit";

const stateOf = (used: number, limit: number): LineState => {
  if (limit <= 0) return "ok";
  if (used >= limit) return "limit";
  if (used / limit >= 0.8) return "warn";
  return "ok";
};

const Line = ({
  icon: Icon,
  remaining,
  noun,
  state,
  used,
  limit,
}: {
  icon: typeof Palette;
  remaining: number;
  noun: string;
  state: LineState;
  used: number;
  limit: number;
}) => {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const text =
    state === "limit"
      ? `Limite de ${noun}s atteinte`
      : state === "warn"
        ? `Il te reste ${remaining} ${noun}${remaining > 1 ? "s" : ""} ce mois-ci`
        : `${remaining} ${noun}${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium leading-tight">
        <Icon
          className={cn(
            "h-3 w-3 shrink-0",
            state === "limit"
              ? "text-destructive"
              : state === "warn"
                ? "text-warning"
                : "text-muted-foreground",
          )}
        />
        <span
          className={cn(
            "truncate",
            state === "limit"
              ? "text-destructive"
              : state === "warn"
                ? "text-warning"
                : "text-foreground",
          )}
        >
          {text}
        </span>
      </div>
      <div className="mt-1 h-px w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            state === "limit"
              ? "bg-destructive/70"
              : state === "warn"
                ? "bg-warning/80"
                : "bg-foreground/30",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Premium, user-oriented monthly capacity widget. Shows what's left to create
 * (clips first — more costly, lower ceiling), not raw usage counters.
 */
const SidebarQuotaWidget = ({ collapsed }: { collapsed: boolean }) => {
  const q = useQuotaUsage();
  const paygEnabled = FEATURE_FLAGS.PAYG_CREDITS_ENABLED;
  const { data: packs } = useCreditPackages(paygEnabled);
  const [open, setOpen] = useState(false);

  if (collapsed || q.loading) return null;

  const plan = normalizePlan(q.plan);
  const planLabel = PLAN_LABEL[plan] ?? "Gratuit";

  // Agency: custom volume — no counters.
  if (plan === "agency") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Voir tes créations ce mois-ci"
          className="mb-1 block w-full cursor-pointer rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 p-2.5 text-left transition-colors hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Créations ce mois-ci
          </p>
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <Sparkles className="h-3 w-3 text-muted-foreground" />
            Volume sur mesure
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/80">{planLabel} · contrat dédié</p>
        </button>
        <CreationCapacityDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  const clipState = stateOf(q.clipsUsed, q.clipsLimit);
  const visualState = stateOf(q.visualsUsed, q.visualsLimit);
  const anyLimit = clipState === "limit" || visualState === "limit";
  const anyWarn = clipState === "warn" || visualState === "warn" || anyLimit;
  const hasPayg = paygEnabled && (packs?.length ?? 0) > 0;

  const ctaIcon = anyLimit && hasPayg ? Coins : Sparkles;
  const ctaLabel = anyLimit
    ? hasPayg
      ? "Acheter des StreamCoins"
      : "Voir mon plan"
    : null;

  const card = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Voir et gérer tes créations ce mois-ci"
      className="mb-1 block w-full cursor-pointer rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 p-2.5 text-left transition-colors hover:bg-sidebar-accent hover:border-sidebar-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        Créations ce mois-ci
      </p>
      <div className="space-y-2">
        <Line
          icon={Clapperboard}
          remaining={q.clipsRemaining}
          noun="clip"
          state={clipState}
          used={q.clipsUsed}
          limit={q.clipsLimit}
        />
        <Line
          icon={Palette}
          remaining={q.visualsRemaining}
          noun="visuel"
          state={visualState}
          used={q.visualsUsed}
          limit={q.visualsLimit}
        />
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/70">
        {planLabel} · renouvellement mensuel
      </p>
      {ctaLabel && (
        <span className="mt-2 flex items-center justify-center gap-1.5 rounded-md border border-border/60 bg-background/60 py-1.5 text-[11px] font-medium text-foreground">
          {(() => {
            const I = ctaIcon;
            return <I className="h-3 w-3" />;
          })()}
          {ctaLabel}
        </span>
      )}
    </button>
  );

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="right" align="end" className="max-w-[220px] text-xs">
            <p className="font-semibold">Détail du mois</p>
            <p className="mt-1 text-muted-foreground">
              Clips : {q.clipsUsed} / {q.clipsLimit} utilisés
            </p>
            <p className="text-muted-foreground">
              Visuels : {q.visualsUsed} / {q.visualsLimit} utilisés
            </p>
            <p className="mt-1 text-muted-foreground">Plan : {planLabel}</p>
            <p className="text-muted-foreground">Renouvellement mensuel</p>
            {anyWarn && !anyLimit && (
              <p className="mt-1 text-warning">Tu approches d'une limite.</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <CreationCapacityDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default SidebarQuotaWidget;
