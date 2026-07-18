import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@/components/ui/badge";

/**
 * Badge — primitive shadcn, **personnalisée** : au-delà des variants stock
 * (default/secondary/destructive/outline), l'app a ajouté `success` et `warning`
 * branchés sur les tokens de statut du DS.
 */
const meta: Meta<typeof Badge> = {
  title: "Primitives/Badge",
  component: Badge,
  parameters: { docs: { description: { component: "Badge — primitive shadcn, **personnalisée** : au-delà des variants stock (default/secondary/destructive/outline), l'app a ajouté success et warning branchés sur les tokens de statut du DS." } },  layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "success", "warning"],
    },
  },
};
export default meta;
type S = StoryObj<typeof Badge>;

export const Default: S = { args: { children: "Pro", variant: "default" } };
export const Success: S = { args: { children: "Publié", variant: "success" } };
export const Warning: S = { args: { children: "En attente", variant: "warning" } };

/** Les 6 variants côte à côte. */
export const AllVariants: S = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Badge>default</Badge>
      <Badge variant="secondary">secondary</Badge>
      <Badge variant="outline">outline</Badge>
      <Badge variant="success">success</Badge>
      <Badge variant="warning">warning</Badge>
      <Badge variant="destructive">destructive</Badge>
    </div>
  ),
};
