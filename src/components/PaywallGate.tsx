import { type ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analytics } from "@/services/analytics";

// ─── Full-page lock (replaces content entirely) ───────────────────────────────

interface FullLockProps {
  icon?: ReactNode;
  feature: string;
  description: string;
  bullets?: string[];
}

export const FullPageLock = ({ icon, feature, description, bullets }: FullLockProps) => {
  useEffect(() => { analytics.paywallHit(feature, "full_page"); }, [feature]);
  return (
  <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card/80 to-card/40 p-8 text-center backdrop-blur-xl">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />

      {/* Icon */}
      <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
        {icon ?? <Lock className="h-6 w-6 text-primary-strong" />}
      </div>

      {/* Text */}
      <p className="relative text-[12px] font-semibold uppercase tracking-[0.18em] text-primary-strong/70">
        Fonctionnalité Pro
      </p>
      <h2 className="relative mt-2 text-xl font-bold text-foreground">{feature}</h2>
      <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

      {/* Bullets */}
      {bullets && bullets.length > 0 && (
        <ul className="relative mt-4 space-y-1.5 text-left">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-strong/60" />
              {b}
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <Button asChild className="relative mt-6 w-full" size="sm">
        <Link to="/billing" onClick={() => analytics.upgradeClicked(feature, "full_page")}>
          Passer Pro
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </Button>
      <p className="relative mt-3 text-[12px] text-muted-foreground/50">
        9,99€/mois · Annulable à tout moment
      </p>
    </div>
  </div>
  );
};

// ─── Inline blur gate (wraps and blurs locked content) ────────────────────────

interface InlineLockProps {
  children: ReactNode;
  feature: string;
  description?: string;
  /** Number of rows to show before blurring (default: shows all children blurred) */
  blurHeight?: string;
}

export const InlineLock = ({
  children,
  feature,
  description,
  blurHeight = "180px",
}: InlineLockProps) => {
  useEffect(() => { analytics.paywallHit(feature, "inline"); }, [feature]);
  return (
  <div className="relative">
    {/* Blurred content */}
    <div
      className="pointer-events-none select-none overflow-hidden"
      style={{ maxHeight: blurHeight }}
      aria-hidden
    >
      <div className="blur-[3px] opacity-50">{children}</div>
    </div>

    {/* Gradient fade into overlay */}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

    {/* Lock overlay */}
    <div className="relative mt-1 flex flex-col items-center gap-3 rounded-xl border border-primary/15 bg-card/60 px-5 py-5 text-center backdrop-blur-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
        <Lock className="h-3.5 w-3.5 text-primary-strong" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{feature}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Button asChild size="sm" variant="outline" className="border-primary/30 text-primary-strong hover:bg-primary/10">
        <Link to="/billing" onClick={() => analytics.upgradeClicked(feature, "inline")}>
          <Sparkles className="mr-1.5 h-3 w-3" />
          Passer au Pro
        </Link>
      </Button>
    </div>
  </div>
  );
};

// ─── Limit banner (shown when free user hits a cap) ───────────────────────────

interface LimitBannerProps {
  current: number;
  max: number;
  label: string;
}

export const LimitBanner = ({ current, max, label }: LimitBannerProps) => {
  useEffect(() => { analytics.paywallHit(label, "limit_banner"); }, [label]);
  return (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-warning/20 bg-warning/[0.04] px-4 py-3">
    <div className="flex items-center gap-2.5">
      <Lock className="h-3.5 w-3.5 shrink-0 text-warning/70" />
      <p className="text-xs text-foreground">
        <span className="font-semibold">{current}/{max} {label}</span>
        {" "}utilisé{current > 1 ? "s" : ""} sur le plan gratuit.
      </p>
    </div>
    <Button asChild size="sm" variant="outline" className="shrink-0 border-primary/30 text-primary-strong hover:bg-primary/10">
      <Link to="/billing" onClick={() => analytics.upgradeClicked(label, "limit_banner")}>
        <Sparkles className="mr-1 h-3 w-3" />
        Pro
      </Link>
    </Button>
  </div>
  );
};
