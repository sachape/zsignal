import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// SelectableCard — tuile/carte SÉLECTIONNABLE (toggle) : presets, options,
// plateformes. Box pilotée par les tokens --selectable-card-* ; couleurs via
// tokens sémantiques. Le contenu (icône, texte, layout) est libre via children.
// Distinct de Chip (petit filtre pill) et de Card (conteneur non-interactif).
const selectableCardVariants = cva(
  "rounded-[var(--selectable-card-radius)] border p-[var(--selectable-card-padding)] text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      selected: {
        true: "border-primary/40 bg-primary/10 text-primary-strong",
        false: "border-border bg-card text-foreground hover:border-primary/30 hover:bg-secondary/40",
      },
    },
    defaultVariants: { selected: false },
  },
);

export interface SelectableCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed">,
    VariantProps<typeof selectableCardVariants> {}

const SelectableCard = React.forwardRef<HTMLButtonElement, SelectableCardProps>(
  ({ className, selected = false, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={!!selected}
      className={cn(selectableCardVariants({ selected }), className)}
      {...props}
    />
  ),
);
SelectableCard.displayName = "SelectableCard";

export { SelectableCard, selectableCardVariants };
