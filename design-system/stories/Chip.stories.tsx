import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip } from "@/components/ui/chip";
import { lock } from "./_lockControls";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof Chip> = {
  title: "Components/Actions/Chip",
  component: Chip,
  tags: ["autodocs"],
  args: { children: "Tous", active: false },
  argTypes: {
    ...common("children", "disabled", "onClick", "className"),
    active: prop("État sélectionné du filtre — câble `aria-pressed`. Un chip n'est pas un bouton : il bascule, il ne déclenche pas.", { control: "boolean", category: CAT.state, defaultValue: "false" }),
    children: { control: "text", description: "Libellé du filtre.", table: { category: "Content" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Chip — pill de filtre INTERACTIF (toggle), avec `aria-pressed`. À utiliser pour filtrer/segmenter une liste. Distinct de Badge (statut, non-interactif)." } },
  },
};
export default meta;
type S = StoryObj<typeof Chip>;

export const Playground: S = {};

export const Inactive: S = { args: { active: false, children: "Twitch" }, argTypes: lock("active") };
export const Active: S = { args: { active: true, children: "Twitch" }, argTypes: lock("active") };

export const FilterRow: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Chip active>Tous</Chip>
      <Chip>À publier</Chip>
      <Chip>Publiés</Chip>
      <Chip>Ignorés</Chip>
    </div>
  ),
};
