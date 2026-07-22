import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@/components/ui/badge";
import { lock } from "./_lockControls";
import { common, prop, CAT } from "./_argTypes";

// Miroir des variantes CVA de badge.tsx (§7). Intentions sémantiques, pas de
// couleurs brutes : success/warning/destructive branchés sur les tokens de statut.
const BADGE_VARIANTS = [
  "default", "secondary", "muted", "outline", "success", "warning", "destructive", "accent",
] as const;

const meta: Meta<typeof Badge> = {
  title: "Components/Content & Structure/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "Badge", variant: "default" },
  argTypes: {
    ...common("children", "className"),
    children: { control: "text", description: "Texte de la pastille.", table: { category: "Content" } },
    variant: {
      control: "select", options: BADGE_VARIANTS,
      description: "Intention de statut (branchée sur les tokens : success/warning/destructive…).",
      table: { category: "Appearance", defaultValue: { summary: "default" } },
    },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Badge — pastille de statut / étiquette. Choisir la variante selon l'INTENTION (succès, alerte, danger), jamais une couleur brute." } },
  },
};
export default meta;
type S = StoryObj<typeof Badge>;

export const Playground: S = {};

export const Default: S = { args: { variant: "default", children: "Pro" }, argTypes: lock("variant") };
export const Secondary: S = { args: { variant: "secondary", children: "Bêta" }, argTypes: lock("variant") };
export const Success: S = { args: { variant: "success", children: "Publié" }, argTypes: lock("variant") };
export const Warning: S = { args: { variant: "warning", children: "En attente" }, argTypes: lock("variant") };
export const Destructive: S = { args: { variant: "destructive", children: "Échec" }, argTypes: lock("variant") };
export const Outline: S = { args: { variant: "outline", children: "Brouillon" }, argTypes: lock("variant") };

export const AllVariants: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-2">
      {BADGE_VARIANTS.map((v) => (
        <Badge key={v} variant={v}>{v}</Badge>
      ))}
    </div>
  ),
};
