import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Chip — pill de filtre INTERACTIF (toggle). Dimensions pilotées par les tokens
// composant --chip-* ; couleurs via tokens sémantiques (bg-primary, muted…).
// Distinct de Badge (statut, non-interactif).
const chipVariants = cva(
  "inline-flex items-center gap-[var(--chip-gap)] whitespace-nowrap rounded-[var(--chip-radius)] border px-[var(--chip-padding-inline)] py-[var(--chip-padding-block)] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      active: {
        true: "border-primary bg-primary/10 text-primary-strong",
        false: "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground",
      },
    },
    defaultVariants: { active: false },
  },
);

export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed">,
    VariantProps<typeof chipVariants> {}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active = false, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={!!active}
      className={cn(chipVariants({ active }), className)}
      {...props}
    />
  ),
);
Chip.displayName = "Chip";

export { Chip, chipVariants };
