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
import { useQuotaUsage } from "@/hooks/useQuotaUsage";
import { useCreditPackages, formatPackPrice, type CreditPackage } from "@/hooks/useCreditPackages";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { normalizePlan } from "@/lib/planAccess";
import { CREDIT_COSTS, formatStreamCoins } from "@/lib/credits";
import { BuyCreditsButton } from "@/components/credits/BuyCreditsButton";
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

const QuotaCard = ({
  icon: Icon,
  noun,
  used,
  limit,
  remaining,
}: {
  icon: typeof Palette;
  noun: string;
  used: number;
  limit: number;
  remaining: number;
}) => {
  const state = stateOf(used, limit);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone =
    state === "limit"
      ? "text-destructive"
      : state === "warn"
        ? "text-warning"
        : "text-foreground";
  const headline =
    state === "limit"
      ? `Limite de ${noun}s atteinte`
      : `Il te reste ${remaining} ${noun}${remaining > 1 ? "s" : ""}`;
  return (
    <div
      className={cn(
        "rounded-xl border bg-card/40 p-4",
        state === "limit"
          ? "border-destructive/40"
          : state === "warn"
            ? "border-warning/40"
            : "border-border/60",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", tone)} />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {noun === "clip" ? "Clips" : "Visuels"}
        </span>
      </div>
      <p className={cn("mt-2 text-base font-semibold leading-tight", tone)}>{headline}</p>
      <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
        {used} / {limit} utilisés ce mois-ci
      </p>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted/40">
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

const PackCard = ({ pack, proBonus }: { pack: CreditPackage; proBonus: boolean }) => {
  const price = formatPackPrice(pack);
  const bonus = proBonus ? Math.round(pack.credits * 0.2) : 0;
  const totalCredits = pack.credits + bonus;
  const estVisuals = Math.floor(totalCredits / CREDIT_COSTS.visual_generation);
  const estClips = Math.floor(totalCredits / CREDIT_COSTS.clip_generation);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{pack.display_name}</p>
          {price && <p className="text-xs text-muted-foreground">{price}</p>}
          {proBonus && (
            <p className="mt-0.5 text-[10px] font-medium text-primary-strong">
              +{bonus.toLocaleString("fr-FR")} bonus Pro = {totalCredits.toLocaleString("fr-FR")} StreamCoins
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
  const q = useQuotaUsage();
  const paygEnabled = FEATURE_FLAGS.PAYG_CREDITS_ENABLED;
  const { data: packs, isLoading: packsLoading } = useCreditPackages(paygEnabled);
  const { data: balance } = useCreditBalance(paygEnabled);
  const queryClient = useQueryClient();

  const plan = normalizePlan(q.plan);
  const planLabel = PLAN_LABEL[plan] ?? "Gratuit";
  const isAgency = plan === "agency";
  const activePacks = packs ?? [];
  const hasActivePacks = activePacks.length > 0;

  // Refresh balance whenever the dialog opens, so a returning user from a
  // successful Stripe Checkout sees their new StreamCoins balance immediately.
  useEffect(() => {
    if (open && paygEnabled) {
      void queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
    }
  }, [open, paygEnabled, queryClient]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Créations ce mois-ci</DialogTitle>
          <DialogDescription>
            Gère tes limites mensuelles et recharge avec des StreamCoins si tu as besoin de plus.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 font-medium text-foreground">
            Plan {planLabel}
          </span>
          <span className="text-muted-foreground">Renouvellement mensuel</span>
        </div>

        {isAgency ? (
          <div className="mt-4 rounded-xl border border-border/60 bg-card/40 p-5 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-primary-strong" />
            <p className="mt-2 text-base font-semibold text-foreground">Volume sur mesure</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ton plan Agency est dimensionné selon ton contrat dédié.
            </p>
            <Link
              to="/billing"
              onClick={() => onOpenChange(false)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
            >
              Voir mon plan <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <QuotaCard
                icon={Clapperboard}
                noun="clip"
                used={q.clipsUsed}
                limit={q.clipsLimit}
                remaining={q.clipsRemaining}
              />
              <QuotaCard
                icon={Palette}
                noun="visuel"
                used={q.visualsUsed}
                limit={q.visualsLimit}
                remaining={q.visualsRemaining}
              />
            </div>

            {paygEnabled && hasActivePacks && (
              <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <Coins className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Recharger avec des StreamCoins
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Besoin de plus ce mois-ci&nbsp;? Achète des StreamCoins et relance tes générations sans changer de plan.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground">
                    Solde&nbsp;: {formatStreamCoins(balance?.available_credits ?? 0)}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {activePacks.map((p) => (
                    <PackCard key={p.id} pack={p} proBonus={(plan as string) !== "free"} />
                  ))}
                </div>
              </div>
            )}

            {paygEnabled && !packsLoading && !hasActivePacks && (
              <div className="mt-5 rounded-xl border border-dashed border-border/60 bg-card/20 p-4 text-center">
                <p className="text-sm text-foreground">
                  Les recharges StreamCoins seront bientôt disponibles.
                </p>
                <Link
                  to="/billing"
                  onClick={() => onOpenChange(false)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-strong hover:underline"
                >
                  Voir mon plan <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            {!paygEnabled && (
              <div className="mt-5 rounded-xl border border-border/60 bg-card/30 p-4">
                <p className="text-sm font-semibold text-foreground">Besoin de plus ce mois-ci&nbsp;?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tu peux passer à un plan supérieur pour augmenter tes limites mensuelles.
                </p>
                <Link
                  to="/billing"
                  onClick={() => onOpenChange(false)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
                >
                  Voir mon plan <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-3">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">Tu crées régulièrement&nbsp;?</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Les plans Pro et Growth restent plus avantageux que les StreamCoins si tu crées du contenu chaque semaine.
                </p>
              </div>
              <Link
                to="/billing"
                onClick={() => onOpenChange(false)}
                className="shrink-0 text-[11px] font-medium text-primary-strong hover:underline"
              >
                Comparer
              </Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CreationCapacityDialog;
