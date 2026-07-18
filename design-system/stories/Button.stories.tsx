import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { Button } from "@/components/ui/button";

/**
 * Button — primitive shadcn. L'une des 9 primitives (sur 49) qui ont une vraie
 * API de variant (CVA). Toutes les couleurs viennent des tokens (--primary…).
 */
const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  parameters: { layout: "centered" },
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

/** Tous les variants côte à côte — la matrice, d'un coup d'œil. */
export const AllVariants: S = {
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
