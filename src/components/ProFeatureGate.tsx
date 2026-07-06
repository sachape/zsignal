import { type ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/hooks/usePlan";
import { analytics } from "@/services/analytics";

/**
 * Reusable Pro gate for advanced growth features.
 *
 * Free (à la carte) → premium preview card with a "Passer Pro" CTA.
 * Pro / Growth / Agency → renders `children` unchanged.
 *
 * This is a thin, opinionated wrapper around the app's plan hierarchy
 * (`usePlan().isPro` already treats Growth/Agency as ≥ Pro). Use it to
 * gate pages like Benchmark, Classements, Calendrier optimal, Débriefs,
 * Historique avancé des lives, Playbooks, StreamScore complet, etc.
 *
 * ⚠️ Do NOT use this to gate:
 *   - Clip / visual generation (paid via StreamCoins)
 *   - StreamCoins top-ups
 *   - Content downloads / basic diagnostic
 */
export interface ProFeatureGateProps {
  /** Analytics identifier (short slug). */
  featureName: string;
  /** Localized title shown on the premium preview. */
  title: string;
  /** Short value-proposition paragraph. */
  description: string;
  /** 0–3 concise value bullets. */
  benefits?: string[];
  /** Content revealed to Pro/Growth/Agency users. */
  children: ReactNode;
  /** Show a loading skeleton until the plan is known (default true). */
  waitForPlan?: boolean;
}

export function ProFeatureGate({
  featureName,
  title,
  description,
  benefits,
  children,
  waitForPlan = true,
}: ProFeatureGateProps) {
  const { isPro, loading } = usePlan();

  if (waitForPlan && loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 py-16">
        <div className="h-10 w-10 animate-pulse rounded-full border border-primary/30 bg-primary/10" />
      </div>
    );
  }

  if (isPro) return <>{children}</>;
  return (
    <ProFeaturePreview
      featureName={featureName}
      title={title}
      description={description}
      benefits={benefits}
    />
  );
}

/**
 * Standalone premium preview (also exported so pages can render it
 * inside a custom layout without wrapping their content).
 */
export function ProFeaturePreview({
  featureName,
  title,
  description,
  benefits,
}: Omit<ProFeatureGateProps, "children" | "waitForPlan">) {
  useEffect(() => {
    analytics.paywallHit(featureName, "full_page");
  }, [featureName]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card/80 to-card/40 p-8 text-center backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <Lock className="h-6 w-6 text-primary-strong" />
        </div>
        <p className="relative text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-strong/70">
          Fonctionnalité Pro
        </p>
        <h2 className="relative mt-2 text-xl font-bold text-foreground">{title}</h2>
        <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {benefits && benefits.length > 0 && (
          <ul className="relative mt-4 space-y-1.5 text-left">
            {benefits.slice(0, 3).map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-strong/60" />
                {b}
              </li>
            ))}
          </ul>
        )}
        <Button asChild className="relative mt-6 w-full" size="sm">
          <Link
            to="/billing"
            onClick={() => analytics.upgradeClicked(featureName, "full_page")}
          >
            Passer Pro
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
        <p className="relative mt-3 text-[11px] text-muted-foreground/50">
          9,99€/mois · Annulable à tout moment
        </p>
      </div>
    </div>
  );
}

export default ProFeatureGate;
