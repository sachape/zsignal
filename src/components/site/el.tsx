import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInViewOnce } from "@/hooks/useInViewOnce";

/**
 * Shared primitives for the ElevenLabs-style marketing site.
 * Scoped, fixed palette (el-*) — independent of the product's dark/lime theme.
 * Editorial: off-white canvas, warm near-black ink, atmospheric pastel orbs.
 */

export const Container = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("mx-auto w-full max-w-[1200px] px-6 md:px-8", className)}>
    {children}
  </div>
);

/** Atmospheric pastel gradient orb — pure decoration, never holds content. */
export const Orb = ({
  className,
  color = "bg-el-mint",
  animate = "slow",
}: {
  className?: string;
  color?: string;
  animate?: "slow" | "fast" | false;
}) => (
  <div
    aria-hidden
    className={cn(
      "pointer-events-none absolute rounded-full opacity-70 blur-[100px] will-change-transform",
      color,
      animate === "slow" && "animate-el-float-slow",
      animate === "fast" && "animate-el-float",
      className,
    )}
  />
);

/** Uppercase section label (caption-uppercase). */
export const Eyebrow = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-el-muted",
      className,
    )}
  >
    {children}
  </span>
);

/** Scroll-reveal wrapper — subtle fade + rise, once. */
export const Reveal = ({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "span";
}) => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.15);
  return (
    <Tag
      // @ts-expect-error ref typing across polymorphic tag is fine here
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        inView ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
        className,
      )}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
};
