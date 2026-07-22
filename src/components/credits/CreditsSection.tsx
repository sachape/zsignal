import { Coins, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { useCreditPackages, formatPackPrice } from "@/hooks/useCreditPackages";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { BuyCreditsButton } from "@/components/credits/BuyCreditsButton";
import { formatStreamCoins, CREDIT_COSTS } from "@/lib/credits";

/**
 * Pay As You Go — StreamCoins section for the Billing page.
 *
 * Visibility rules:
 *   - Hidden entirely when PAYG_CREDITS_ENABLED is false.
 *   - When ON, shown only if at least one pack is active server-side
 *     (is_active = true AND stripe_price_id set). Otherwise we render nothing.
 */
export function CreditsSection() {
  const flagOn = isFeatureEnabled("PAYG_CREDITS_ENABLED");
  const balance = useCreditBalance(flagOn);
  const packs = useCreditPackages(flagOn);

  if (!flagOn) return null;
  if (packs.isLoading) return null;
  const activePacks = packs.data ?? [];
  if (activePacks.length === 0) return null;

  const available = balance.data?.available_credits ?? 0;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
        StreamCoins
      </h2>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Coins className="h-4 w-4 text-primary-strong" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Besoin de quelques générations en plus&nbsp;?
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Achète des StreamCoins sans changer d'abonnement.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Solde&nbsp;:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatStreamCoins(available)}
                </span>
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground/80">
                1 visuel&nbsp;= {CREDIT_COSTS.visual_generation} StreamCoins · 1 clip&nbsp;= {CREDIT_COSTS.clip_generation} StreamCoins
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {activePacks.map((p) => {
                  const price = formatPackPrice(p);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{p.display_name}</p>
                        {(p.description || price) && (
                          <p className="truncate text-[12px] text-muted-foreground">
                            {price ? <span className="font-semibold text-foreground">{price}</span> : null}
                            {price && p.description ? " · " : ""}
                            {p.description}
                          </p>
                        )}
                      </div>
                      <BuyCreditsButton
                        packageId={p.id}
                        label="Acheter"
                        variant="outline"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <Sparkles className="h-4 w-4 text-primary-strong/60" />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default CreditsSection;
