import { Coins, ArrowUpRight } from "lucide-react";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { usePlan } from "@/hooks/usePlan";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStreamCoinsDialog } from "@/contexts/StreamCoinsDialogContext";
import { cn } from "@/lib/utils";

/**
 * StreamCoins sidebar card.
 *
 * Replaces the previous monthly-quota widget. Under the new pricing model
 * generation is paid via StreamCoins, so the sidebar surfaces the balance
 * and a top-up CTA rather than "X clips / Y visuels restants ce mois-ci".
 */
const SidebarQuotaWidget = ({ collapsed }: { collapsed: boolean }) => {
  const { data: balance, isLoading } = useCreditBalance(true);
  const { isPro } = usePlan();
  const { open } = useStreamCoinsDialog();

  if (collapsed || isLoading) return null;

  const available = balance?.available_credits ?? 0;
  const isLow = available < 350; // less than one clip
  const isEmpty = available <= 0;

  const card = (
    <button
      type="button"
      onClick={() => open()}
      aria-label="Voir mon solde StreamCoins et recharger"
      className="mb-1 block w-full cursor-pointer rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 p-2.5 text-left transition-colors hover:bg-sidebar-accent hover:border-sidebar-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        <Coins className="h-3 w-3" />
        StreamCoins
        {isPro && (
          <span className="ml-auto rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-primary-strong">
            Pro +20%
          </span>
        )}
      </p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums leading-tight",
          isEmpty ? "text-destructive" : isLow ? "text-warning" : "text-foreground",
        )}
      >
        {available.toLocaleString("fr-FR")}
      </p>
      {isLow && !isEmpty && (
        <p className="mt-0.5 text-[10px] font-medium text-warning">Solde faible</p>
      )}
      {isEmpty && (
        <p className="mt-0.5 text-[10px] font-medium text-destructive">Solde à zéro</p>
      )}
      <span
        className={cn(
          "mt-2 flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-[11px] font-medium",
          isLow || isEmpty
            ? "border-primary/40 bg-primary/10 text-primary-strong"
            : "border-border/60 bg-background/60 text-foreground",
        )}
      >
        <ArrowUpRight className="h-3 w-3" />
        Recharger
      </span>
    </button>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent side="right" align="end" className="max-w-[220px] text-xs">
          <p className="font-semibold">Ton solde StreamCoins</p>
          <p className="mt-1 text-muted-foreground">
            Utilise tes StreamCoins pour générer des clips ou des visuels à la demande.
          </p>
          <p className="mt-1 text-muted-foreground">1 clip = 350 · 1 visuel = 120</p>
          {isPro && (
            <p className="mt-1 text-primary-strong">Bonus Pro +20% appliqué à tes recharges.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SidebarQuotaWidget;
