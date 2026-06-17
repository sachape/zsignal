import { CSSProperties, ReactNode } from "react";

type Tone = "default" | "contrast" | "deep" | "light";

/**
 * Shared atmospheric wrapper for landing sections.
 * `tone="light"` flips to an off-white surface with inverted text tokens
 * scoped to the section, so any child using `text-foreground` / `bg-card` /
 * `border-border` etc. adapts automatically.
 */
export const SectionShell = ({
  children,
  id,
  className = "",
  glow = true,
  grid = true,
  tone = "default",
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  glow?: boolean;
  grid?: boolean;
  tone?: Tone;
}) => {
  const isLight = tone === "light";

  const toneClasses: Record<Tone, string> = {
    default: "bg-background text-foreground",
    contrast: "bg-[hsl(220_16%_8%)] text-foreground",
    deep: "bg-[hsl(220_24%_4%)] text-foreground",
    light: "text-foreground",
  };

  // Scoped token override for the "light" surface. Children consuming
  // semantic tokens (foreground, card, border, muted, etc.) flip naturally.
  const lightStyle: CSSProperties | undefined = isLight
    ? ({
        ["--background" as never]: "40 30% 97%",
        ["--foreground" as never]: "220 28% 10%",
        ["--card" as never]: "0 0% 100%",
        ["--card-foreground" as never]: "220 28% 10%",
        ["--muted" as never]: "220 14% 92%",
        ["--muted-foreground" as never]: "220 12% 38%",
        ["--border" as never]: "220 14% 88%",
        ["--popover" as never]: "0 0% 100%",
        ["--popover-foreground" as never]: "220 28% 10%",
        ["--secondary" as never]: "220 14% 94%",
        ["--secondary-foreground" as never]: "220 28% 15%",
        ["--accent" as never]: "172 60% 36%",
        ["--accent-foreground" as never]: "0 0% 100%",
        backgroundColor: "hsl(40 30% 97%)",
      } as CSSProperties)
    : undefined;

  return (
    <section
      id={id}
      style={lightStyle}
      className={`relative overflow-hidden py-16 sm:py-20 md:py-28 lg:py-32 scroll-mt-24 md:scroll-mt-28 ${toneClasses[tone]} ${className}`}
    >
      {/* Top transition fade (skip on light to keep crisp boundary) */}
      {!isLight && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/40 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/40 to-transparent" />
        </>
      )}

      {/* Restraint: one faint ambient light, animated aurora dialed way down. */}
      {glow && !isLight && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.03),transparent_60%)]" />
      )}
      {glow && !isLight && (
        <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[48rem] -translate-x-1/2 landing-aurora opacity-25" aria-hidden />
      )}
      {grid && (
        <div
          className={`landing-grid-pan pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/${isLight ? "0.05" : "0.035"})_1px,transparent_1px)] bg-[size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)] opacity-25`}
        />
      )}
      {/* Light variant: subtle warm accent halo */}
      {isLight && (
        <>
          <div className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[hsl(172_60%_45%/0.08)] blur-[140px]" />
        </>
      )}

      <div className="container relative mx-auto max-w-6xl px-4 md:px-6">{children}</div>
    </section>
  );
};

export const SectionBadge = ({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "light" }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] ${
      tone === "light"
        ? "border-foreground/15 bg-foreground/[0.04] text-foreground/70"
        : "border-primary/20 bg-primary/10 text-primary shadow-[0_0_24px_hsl(var(--primary)/0.18)]"
    }`}
  >
    {children}
  </span>
);

export const SectionHeading = ({
  badge,
  title,
  subtitle,
  align = "center",
  badgeTone = "default",
}: {
  badge?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  badgeTone?: "default" | "light";
}) => (
  <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
    {badge && <SectionBadge tone={badgeTone}>{badge}</SectionBadge>}
    <h2 className="mt-4 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl md:text-[44px] md:leading-[1.1]">
      {title}
    </h2>
    {subtitle && (
      <p className="mt-4 text-base text-foreground/70 sm:text-lg">{subtitle}</p>
    )}
  </div>
);

/** Standard glass card. */
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
      interactive ? "transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12]" : ""
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

/** Floating card with subtle float animation. */
export const FloatingCard = ({
  children,
  className = "",
  delay = 0,
  duration = 7,
  rotate = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  rotate?: number;
}) => (
  <div
    className={`relative rounded-2xl border border-white/10 bg-card/70 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)] backdrop-blur-xl ${className}`}
    style={
      {
        animation: `hero-float ${duration}s ease-in-out infinite ${delay}s`,
        transform: `rotate(${rotate}deg)`,
      } as CSSProperties
    }
  >
    {children}
  </div>
);
