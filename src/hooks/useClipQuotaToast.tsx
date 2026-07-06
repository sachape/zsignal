/**
 * Shared toast helper for the "clip quota exceeded" UX.
 *
 * Used by every entry point that calls `clip-job-create` so the wording,
 * the StreamCoins messaging and the CTA stay consistent:
 *   - VodImportPage (Continuer la préparation)
 *   - ClipsPage (Transformer en Short)
 *   - AutoClipCandidatesPanel (Générer un clip auto-détecté)
 *   - ClipPreparationPanel (panneau inline + ClipGenerationDialog)
 *
 * Behavior:
 *   - Title: "Tu as atteint ta limite de clips générés ce mois-ci."
 *   - If PAYG_CREDITS_ENABLED is ON and at least one StreamCoins pack is active,
 *     show the cost in StreamCoins + "Acheter des StreamCoins" CTA.
 *   - Otherwise fallback to the standard upgrade CTA from `quotaCta(plan)`.
 */
import { useCallback } from "react";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { streamCoinsCostLabel } from "@/lib/credits";
import { quotaCta } from "@/lib/quotas";
import { usePlan } from "@/hooks/usePlan";
import { useCreditPackages } from "@/hooks/useCreditPackages";
import { useStreamCoinsDialog } from "@/contexts/StreamCoinsDialogContext";

export function useClipQuotaToast() {
  const { open: openStreamCoins } = useStreamCoinsDialog();
  const { plan } = usePlan();
  const paygOn = isFeatureEnabled("PAYG_CREDITS_ENABLED");
  const creditPacks = useCreditPackages(paygOn);

  return useCallback(() => {
    const hasActivePacks = (creditPacks.data?.length ?? 0) > 0;
    const showCoins = paygOn && hasActivePacks;
    const cta = quotaCta(plan);
    const description = `Il te faut ${streamCoinsCostLabel("clip_generation")} pour générer ce clip.`;
    const label = showCoins ? "Recharger mes StreamCoins" : cta.label;

    toast({
      title: "Tu n’as pas assez de StreamCoins pour générer ce clip.",
      description,
      variant: "destructive",
      action: (
        <ToastAction altText={label} onClick={() => openStreamCoins()}>
          {label}
        </ToastAction>
      ),
    });
  }, [creditPacks.data, openStreamCoins, paygOn, plan]);
}
