import * as React from "react";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Toggle — RÉGLAGE on/off : l'interrupteur coulissant avec son libellé et sa
// description. C'est ce que tout le monde appelle « un toggle » (« Mode sombre »,
// « Notifications »). L'effet est immédiat, sans étape de validation.
//
// Pourquoi un composant plutôt qu'un `Switch` + un `Label` composés à la main :
// le produit avait trois copies divergentes de cette ligne, dont une où le
// Switch n'était relié à aucun texte — donc muet au lecteur d'écran. Ici la
// liaison `htmlFor` / `aria-describedby` est faite par construction : on ne peut
// plus l'oublier.
//
//   ⚠️ Distinct de ToggleButton (bouton bascule type gras/italique) et de
//   Checkbox (choix à valider dans un formulaire).
//
// Layout-agnostic comme SelectableCard : le composant ne fournit que la ligne
// (libellé, description, interrupteur, alignement). Encadrement, padding et
// fond restent libres via `className`.

export interface ToggleProps extends Omit<React.ComponentPropsWithoutRef<typeof Switch>, "id" | "aria-describedby"> {
  /** Libellé visible. Cliquer dessus bascule l'interrupteur. */
  label: React.ReactNode;
  /** Précision sous le libellé — la conséquence du réglage, pas sa répétition. */
  description?: React.ReactNode;
  /** Icône décorative devant le libellé (masquée aux lecteurs d'écran). */
  icon?: React.ReactNode;
}

const Toggle = React.forwardRef<React.ElementRef<typeof Switch>, ToggleProps>(
  ({ className, label, description, icon, disabled, ...props }, ref) => {
    const id = React.useId();
    const descriptionId = `${id}-description`;

    return (
      <div className={cn("flex w-full items-center justify-between gap-4", className)}>
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span className="shrink-0 text-muted-foreground" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            {/* Désactivé : on atténue le libellé d'un cran (foreground →
                muted-foreground) mais JAMAIS via une opacité sur la ligne — la
                description est déjà atténuée, et le cumul la fait passer sous
                le contraste AA (mesuré à 2.74:1). Le Switch, lui, porte déjà
                son propre `disabled:opacity-50` et son curseur. */}
            <Label htmlFor={id} className={cn("font-normal", disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer")}>
              {label}
            </Label>
            {description ? (
              <p id={descriptionId} className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <Switch
          ref={ref}
          id={id}
          disabled={disabled}
          aria-describedby={description ? descriptionId : undefined}
          className="shrink-0"
          {...props}
        />
      </div>
    );
  },
);
Toggle.displayName = "Toggle";

export { Toggle };
