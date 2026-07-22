import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ToggleButton — BOUTON bascule (le « B / I / U » d'une barre d'outils) : une
// action à deux états, rendue en `<button aria-pressed>`. Il ressemble à un
// bouton, c'est voulu.
//   ⚠️ Ce n'est PAS l'interrupteur coulissant. Pour un réglage on/off
//   (« Mode sombre », « Notifications »), utiliser `Toggle` — voir toggle.tsx.
const toggleButtonVariants = cva(
  // État actif (on) : tinte lime de marque + texte lime, pas le teal `accent`
  // (qui est la couleur secondaire de tint, pas une surface d'interaction).
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary/15 data-[state=on]:text-primary-strong",
  {
    variants: {
      variant: {
        // Une bordure à l'état off : sans elle, un bouton non pressé n'a aucune
        // affordance — il ne reste qu'un mot qui flotte, rien ne dit qu'il est
        // cliquable ni qu'il a deux états.
        default: "border border-input bg-transparent",
        ghost: "bg-transparent",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const ToggleButton = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleButtonVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleButtonVariants({ variant, size, className }))} {...props} />
));

ToggleButton.displayName = TogglePrimitive.Root.displayName;

export { ToggleButton, toggleButtonVariants };
