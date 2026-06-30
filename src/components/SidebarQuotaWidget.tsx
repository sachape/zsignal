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

  if (collapsed || q.loading) return null;

  const plan = normalizePlan(q.plan);
  const planLabel = PLAN_LABEL[plan] ?? "Gratuit";

  // Agency: custom volume — no counters.
  if (plan === "agency") {
    return (
      <Link
        to="/billing"
        title="Volume sur mesure"
        className="mb-1 block rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 p-2.5 transition-colors hover:bg-sidebar-accent"
      >
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Créations ce mois-ci
        </p>
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
          <Sparkles className="h-3 w-3 text-muted-foreground" />
          Volume sur mesure
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/80">{planLabel} · contrat dédié</p>
      </Link>
    );
  }

  const clipState = stateOf(q.clipsUsed, q.clipsLimit);
  const visualState = stateOf(q.visualsUsed, q.visualsLimit);
  const anyLimit = clipState === "limit" || visualState === "limit";
  const anyWarn = clipState === "warn" || visualState === "warn" || anyLimit;
  const hasPayg = paygEnabled && (packs?.length ?? 0) > 0;

  const cta = anyLimit
    ? hasPayg
      ? { label: "Acheter des StreamCoins", href: "/billing", icon: Coins }
      : { label: "Voir mon plan", href: "/billing", icon: Sparkles }
    : null;

  const card = (
    <div className="mb-1 block rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 p-2.5 transition-colors hover:bg-sidebar-accent">
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
      {cta && (
        <Link
          to={cta.href}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-md border border-border/60 bg-background/60 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-background"
        >
          <cta.icon className="h-3 w-3" />
          {cta.label}
        </Link>
      )}
    </div>
  );

  const wrapped = (
    <Link to="/billing" title="Tes créations ce mois-ci" className="block">
      {card}
    </Link>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{wrapped}</TooltipTrigger>
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
  );
};

export default SidebarQuotaWidget;
