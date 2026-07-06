import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Clapperboard, Palette, Coins, Sparkles, ArrowUpRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCreditPackages, formatPackPrice, type CreditPackage } from "@/hooks/useCreditPackages";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { usePlan } from "@/hooks/usePlan";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { CREDIT_COSTS } from "@/lib/credits";
import { BuyCreditsButton } from "@/components/credits/BuyCreditsButton";
import { cn } from "@/lib/utils";

const LOW_THRESHOLD = 350; // one clip

const PackCard = ({ pack, proBonus }: { pack: CreditPackage; proBonus: boolean }) => {
  const price = formatPackPrice(pack);
  const bonus = proBonus ? Math.round(pack.credits * 0.2) : 0;
  const total = pack.credits + bonus;
  const estVisuals = Math.floor(total / CREDIT_COSTS.visual_generation);
  const estClips = Math.floor(total / CREDIT_COSTS.clip_generation);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{pack.display_name}</p>
          {price && <p className="text-xs text-muted-foreground">{price}</p>}
          {proBonus && (
            <p className="mt-0.5 text-[10px] font-medium text-primary-strong">
              +{bonus.toLocaleString("fr-FR")} bonus Pro = {total.toLocaleString("fr-FR")} StreamCoins
            </p>
          )}
        </div>
        {pack.badge && (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary-strong">
            {pack.badge}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
          <Palette className="h-2.5 w-2.5" /> ≈ {estVisuals} visuels
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
          <Clapperboard className="h-2.5 w-2.5" /> ≈ {estClips} clips
        </span>
      </div>
      <BuyCreditsButton packageId={pack.id} label="Acheter" variant="outline" className="w-full" />
    </div>
  );
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreationCapacityDialog({ open, onOpenChange }: Props) {
  const paygEnabled = FEATURE_FLAGS.PAYG_CREDITS_ENABLED;
  const { data: packs, isLoading: packsLoading } = useCreditPackages(paygEnabled);
  const { data: balance } = useCreditBalance(true);
  const { plan, isPro } = usePlan();
  const queryClient = useQueryClient();

  const available = balance?.available_credits ?? 0;
  const isEmpty = available <= 0;
  const isLow = !isEmpty && available < LOW_THRESHOLD;
  const activePacks = packs ?? [];
  const hasActivePacks = activePacks.length > 0;
  // Growth / Agency legacy subscribers also get the +20% recharge bonus.
  const proBonusEligible = (plan as string) !== "free";

  // Refresh balance whenever the dialog opens.
  useEffect(() => {
    if (open) {
      void queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
    }
  }, [open, queryClient]);

  const statusLabel = isEmpty
    ? "Solde à zéro"
    : isLow
      ? "Solde faible"
      : `${available.toLocaleString("fr-FR")} StreamCoins disponibles`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mes StreamCoins</DialogTitle>
          <DialogDescription>
            Utilise tes StreamCoins pour générer des clips et des visuels quand tu en as besoin.
          </DialogDescription>
        </DialogHeader>

        {/* Balance */}
        <div
          className={cn(
            "mt-2 flex items-center gap-3 rounded-xl border p-4",
            isEmpty
              ? "border-destructive/40 bg-destructive/5"
              : isLow
                ? "border-warning/40 bg-warning/5"
                : "border-border/60 bg-card/40",
          )}
        >
          <Coins
            className={cn(
              "h-5 w-5 shrink-0",
              isEmpty ? "text-destructive" : isLow ? "text-warning" : "text-primary-strong",
            )}
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums leading-none",
                isEmpty ? "text-destructive" : isLow ? "text-warning" : "text-foreground",
              )}
            >
              {available.toLocaleString("fr-FR")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{statusLabel}</p>
          </div>
          {isPro && (
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-strong">
              Pro +20%
            </span>
          )}
        </div>

        {/* Usage */}
        <div className="mt-4 rounded-xl border border-border/60 bg-card/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Utilisation</p>
          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <span>1 visuel</span>
              <span className="ml-auto tabular-nums text-muted-foreground">
                {CREDIT_COSTS.visual_generation} StreamCoins
              </span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Clapperboard className="h-4 w-4 text-muted-foreground" />
              <span>1 clip</span>
              <span className="ml-auto tabular-nums text-muted-foreground">
                {CREDIT_COSTS.clip_generation} StreamCoins
              </span>
            </div>
          </div>
        </div>

        {/* Recharge */}
        <div className="mt-4">
          <div className="mb-2">
            <p className="text-sm font-semibold text-foreground">Recharger</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Achète des StreamCoins pour générer plus de clips ou de visuels.
            </p>
          </div>

          {paygEnabled && hasActivePacks && (
            <>
              {proBonusEligible && (
                <p className="mb-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary-strong">
                  <Sparkles className="h-3 w-3" />
                  Bonus Pro appliqué : +20%
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {activePacks.map((p) => (
                  <PackCard key={p.id} pack={p} proBonus={proBonusEligible} />
                ))}
              </div>
              {!proBonusEligible && (
                <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">Tu génères régulièrement&nbsp;?</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Passe Pro et reçois +20% de StreamCoins sur chaque recharge.
                    </p>
                  </div>
                  <Link
                    to="/billing"
                    onClick={() => onOpenChange(false)}
                    className="shrink-0 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary-strong transition-colors hover:bg-primary/15"
                  >
                    Passer Pro
                  </Link>
                </div>
              )}
            </>
          )}

          {(!paygEnabled || (!packsLoading && !hasActivePacks)) && (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-4 text-center">
              <p className="text-sm text-foreground">
                Les recharges StreamCoins seront bientôt disponibles.
              </p>
              <Link
                to="/billing"
                onClick={() => onOpenChange(false)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-strong hover:underline"
              >
                {isPro ? "Voir mon plan" : "Découvrir Pro"} <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreationCapacityDialog;
