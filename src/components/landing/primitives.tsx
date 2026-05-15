import { ReactNode } from "react";

/**
 * Shared atmospheric wrapper for landing sections.
 * Provides:
 *  - dark page-consistent background
 *  - centered radial green spotlight
 *  - faint dot grid masked toward center
 *  - vertical rhythm py-24 md:py-32
 */
export const SectionShell = ({
  children,
  id,
  className = "",
  glow = true,
  grid = true,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  glow?: boolean;
  grid?: boolean;
}) => (
  <section id={id} className={`relative overflow-hidden py-16 sm:py-20 md:py-28 lg:py-32 scroll-mt-24 md:scroll-mt-28 ${className}`}>
    {glow && (
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_60%)]" />
    )}
    {grid && (
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-40" />
    )}
    <div className="container relative mx-auto max-w-6xl px-4 md:px-6">{children}</div>
  </section>
);

export const SectionBadge = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
    {children}
  </span>
);

export const SectionHeading = ({
  badge,
  title,
  subtitle,
}: {
  badge?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
}) => (
  <div className="mx-auto max-w-2xl text-center">
    {badge && <SectionBadge>{badge}</SectionBadge>}
    <h2 className="mt-4 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl">
      {title}
    </h2>
    {subtitle && (
      <p className="mt-3 text-sm text-foreground/70 sm:mt-4 sm:text-base md:text-lg">{subtitle}</p>
    )}
  </div>
);

/** Standard glass card. Set `interactive` for hover lift; otherwise no hover affordance. */
export const GlassCard = ({
  children,
  className = "",
  interactive = false,
  hero = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  hero?: boolean;
}) => (
  <div
    className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl ${
      interactive
        ? "transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12]"
        : ""
    } ${className}`}
  >
    {hero && <span className="bento-hero-border" aria-hidden />}
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_55%)]" />
    <div className="relative flex h-full flex-col">{children}</div>
  </div>
);

export const MicroLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 md:text-[11px]">
    {children}
  </span>
);
