import { Coins, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { useCreditPackages } from "@/hooks/useCreditPackages";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { BuyCreditsButton } from "@/components/credits/BuyCreditsButton";

/**
 * Pay As You Go section for the Billing page.
 *
 * Visibility rules:
 *   - Hidden entirely when PAYG_CREDITS_ENABLED is false.
 *   - When ON, shown only if at least one credit pack is active server-side
 *     (is_active = true AND stripe_price_id set). Otherwise we render
 *     nothing — no "Bientôt" teaser on Billing to avoid noise.
 *
 * Balance is always shown when the section is visible so users understand
 * what they already own (e.g. bonus credits).
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
        Crédits à la demande
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
                Achète des crédits sans changer d'abonnement.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Solde actuel&nbsp;:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {available} crédit{available === 1 ? "" : "s"}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                1 crédit&nbsp;= 1 visuel · 8 crédits&nbsp;= 1 clip
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {activePacks.map((p) => (
                  <BuyCreditsButton
                    key={p.id}
                    packageId={p.id}
                    label={p.display_name}
                    variant="outline"
                  />
                ))}
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
