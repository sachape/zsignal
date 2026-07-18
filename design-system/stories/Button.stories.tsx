import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/button";

/**
 * Button — primitive shadcn. L'une des 9 primitives (sur 49) qui ont une vraie
 * API de variant (CVA). Toutes les couleurs viennent des tokens (--primary…).
 */
const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive", "link"],
    },
    size: { control: "select", options: ["default", "sm", "lg", "icon"] },
  },
};
export default meta;
type S = StoryObj<typeof Button>;

export const Primary: S = { args: { children: "Générer les clips", variant: "default" } };
export const Secondary: S = { args: { children: "Annuler", variant: "secondary" } };
export const Outline: S = { args: { children: "Voir le détail", variant: "outline" } };
export const Destructive: S = { args: { children: "Supprimer", variant: "destructive" } };
export const Ghost: S = { args: { children: "Passer", variant: "ghost" } };

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
