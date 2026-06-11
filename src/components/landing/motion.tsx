// Shared motion language for the marketing landing.
// Built on framer-motion (already a project dependency). Every primitive
// respects prefers-reduced-motion: when the user opts out, reveals collapse
// to a plain fade and parallax/float are disabled entirely.
//
// Animations are restricted to transform/opacity so they stay on the GPU
// compositor and never trigger layout. These wrappers are purely additive —
// they layer richer motion (scroll parallax, infinite float, staggered
// reveals) on top of the existing sections without changing their content.

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionProps,
  type Variants,
} from "framer-motion";
import { forwardRef, useRef, type ReactNode } from "react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Fade + slide-up reveal triggered once when the element scrolls into view.
 * `y` is the starting offset (px), `delay` in seconds, `duration` in seconds.
 */
export const Reveal = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    className?: string;
    delay?: number;
    y?: number;
    duration?: number;
    once?: boolean;
    amount?: number;
  } & MotionProps
>(function Reveal(
  { children, className, delay = 0, y = 24, duration = 0.7, once = true, amount = 0.3, ...rest },
  ref,
) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, ease: EASE_OUT, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

/**
 * Container that reveals its <StaggerItem> children in cascade.
 */
export const Stagger = ({
  children,
  className,
  delayChildren = 0,
  stagger = 0.09,
  once = true,
  amount = 0.25,
}: {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
  stagger?: number;
  once?: boolean;
  amount?: number;
}) => {
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({
  children,
  className,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) => {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
  };
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
};

/**
 * Scroll-linked vertical parallax. `strength` is the px translation across the
 * element's full scroll traversal (positive = moves up as you scroll down).
 * No-ops under reduced motion.
 */
export const Parallax = ({
  children,
  className,
  strength = 60,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [strength, -strength]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : { y }}>{children}</motion.div>
    </div>
  );
};

/**
 * Gentle infinite float for hero/feature mockups. Disabled under reduced motion.
 */
export const FloatCard = ({
  children,
  className,
  range = 10,
  duration = 6,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  range?: number;
  duration?: number;
  delay?: number;
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      animate={reduce ? undefined : { y: [0, -range, 0] }}
      transition={
        reduce ? undefined : { duration, ease: "easeInOut", repeat: Infinity, delay }
      }
    >
      {children}
    </motion.div>
  );
};
