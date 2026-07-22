import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// SelectableCard — tuile/carte SÉLECTIONNABLE (toggle) : presets, options,
// plateformes, tuiles média. LAYOUT-AGNOSTIC : ne fournit que la box (radius,
// bordure, état selected + a11y aria-pressed) ; padding, alignement et contenu
// sont libres via className/children — s'adapte aux tuiles compactes, grandes
// cartes ou aperçus image.
//   highlight="tint"  → fond teinté (défaut) : tuiles de contenu/texte.
//   highlight="ring"  → anneau + bordure, SANS fond teinté : tuiles image/média
//                       (un tint laverait l'aperçu).
// Distinct de Chip (petit filtre pill) et de Card (conteneur non-interactif).
const selectableCardVariants = cva(
  "rounded-[var(--selectable-card-radius)] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      highlight: { tint: "", ring: "" },
      selected: { true: "", false: "" },
    },
    compoundVariants: [
      { highlight: "tint", selected: true, class: "border-primary/40 bg-primary/10 text-primary-strong" },
      { highlight: "tint", selected: false, class: "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground" },
      { highlight: "ring", selected: true, class: "border-primary ring-1 ring-primary/40" },
      { highlight: "ring", selected: false, class: "border-border hover:border-border/80" },
    ],
    defaultVariants: { highlight: "tint", selected: false },
  },
);

export interface SelectableCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed">,
    VariantProps<typeof selectableCardVariants> {}

const SelectableCard = React.forwardRef<HTMLButtonElement, SelectableCardProps>(
  ({ className, selected = false, highlight = "tint", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={!!selected}
      className={cn(selectableCardVariants({ selected, highlight }), className)}
      {...props}
    />
  ),
);
SelectableCard.displayName = "SelectableCard";

export { SelectableCard, selectableCardVariants };
