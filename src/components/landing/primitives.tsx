import { ReactNode } from "react";

export const SectionShell = ({
  children,
  id,
  className = "",
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) => (
  <section
    id={id}
    className={`relative py-16 sm:py-20 md:py-28 lg:py-32 scroll-mt-24 md:scroll-mt-28 ${className}`}
  >
    <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
      {children}
    </div>
  </section>
);

/** Black pill badge — matches the speech-bubble sticker style of the illustrations */
export const SectionBadge = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-background">
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
    <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl">
      {title}
    </h2>
    {subtitle && (
      <p className="mt-4 text-base text-muted-foreground sm:text-lg">{subtitle}</p>
    )}
  </div>
);

/**
 * Bold outline card — white bg, thick dark border, drop shadow.
 * hero=true: green border + green shadow (highlighted plan, featured block).
 * interactive=true: hover lift effect.
 */
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
    className={`group relative overflow-hidden rounded-2xl bg-card border-2 ${
      hero
        ? "border-primary"
        : "border-foreground/75"
    } ${
      interactive
        ? "transition-all duration-150 hover:-translate-x-px hover:-translate-y-px"
        : ""
    } ${className}`}
    style={{
      boxShadow: hero
        ? "4px 4px 0 0 hsl(var(--primary))"
        : "4px 4px 0 0 rgba(23,29,46,0.72)",
    }}
  >
    <div className="relative flex h-full flex-col">{children}</div>
  </div>
);

export const MicroLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground md:text-[11px]">
    {children}
  </span>
);
