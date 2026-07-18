import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { Sparkles, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Button — primitive shadcn. L'une des 9 primitives (sur 49) qui ont une vraie
 * API de variant (CVA). Toutes les couleurs viennent des tokens (--primary…).
 */
const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  parameters: { docs: { description: { component: "Button — primitive shadcn. L'une des 9 primitives (sur 49) qui ont une vraie API de variant (CVA)." } },  layout: "centered" },
  // onClick espionné (fn()) : les play functions vérifient qu'il part — ou pas.
  args: { onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive", "link"],
    },
    size: { control: "select", options: ["default", "sm", "lg", "icon"] },
    // asChild n'est PAS une prop visuelle : c'est de la composition (Slot). Si
    // on l'active avec un enfant texte, Slot n'a pas d'élément à cloner et le
    // bouton disparaît. On le retire des contrôles pour éviter ce faux « bug ».
    asChild: { control: false, table: { disable: true } },
  },
};
export default meta;
type S = StoryObj<typeof Button>;

/**
 * Playground — LA story pilotée par les contrôles. Change `variant` et `size`
 * dans le panneau Controls, le bouton se met à jour en direct (les autres
 * stories figent leurs args pour montrer un cas précis).
 */
export const Playground: S = {
  args: { children: "Bouton", variant: "default", size: "default" },
};

export const Primary: S = {
  args: { children: "Générer les clips", variant: "default" },
  // Comportement : un clic déclenche onClick une fois.
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: /générer les clips/i });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
export const Secondary: S = { args: { children: "Annuler", variant: "secondary" } };
export const Outline: S = { args: { children: "Voir le détail", variant: "outline" } };
export const Destructive: S = { args: { children: "Supprimer", variant: "destructive" } };
export const Ghost: S = { args: { children: "Passer", variant: "ghost" } };

/** Désactivé : le clic ne doit JAMAIS déclencher onClick. */
export const Disabled: S = {
  args: { children: "Générer les clips", variant: "default", disabled: true },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: /générer les clips/i });
    await expect(button).toBeDisabled();
    // shadcn applique `disabled:pointer-events-none` : userEvent refuserait un
    // clic normal. On désactive le garde-fou pour FORCER le clic et prouver que
    // l'attribut `disabled` natif bloque quand même le handler.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** Avec icône : une icône lucide en enfant + le texte. L'icône est mise à
 *  l'échelle automatiquement (`[&_svg]:size-4`) et hérite de la couleur. */
export const WithIcon: S = {
  render: (args) => (
    <Button {...args}>
      <Sparkles /> Générer des clips
    </Button>
  ),
  args: { variant: "default" },
};

/** Icône seule : `size="icon"` (bouton carré). Toujours fournir un
 *  `aria-label` — sans texte, c'est la seule étiquette accessible. */
export const IconOnly: S = {
  render: (args) => (
    <div style={{ display: "flex", gap: 8 }}>
      <Button {...args} size="icon" aria-label="Télécharger"><Download /></Button>
      <Button {...args} size="icon" variant="secondary" aria-label="Ajouter"><Plus /></Button>
      <Button {...args} size="icon" variant="outline" aria-label="Ajouter"><Plus /></Button>
    </div>
  ),
  args: { variant: "default" },
};

/** Tous les variants côte à côte — la matrice, d'un coup d'œil. Vitrine
 *  STATIQUE : les contrôles n'ont pas d'effet ici (voir Playground pour ça). */
export const AllVariants: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};
