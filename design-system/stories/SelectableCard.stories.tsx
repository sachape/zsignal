import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Zap } from "lucide-react";
import { SelectableCard } from "@/components/ui/selectable-card";
import { lock } from "./_lockControls";

const meta: Meta<typeof SelectableCard> = {
  title: "Components/Actions/Selectable Card",
  component: SelectableCard,
  tags: ["autodocs"],
  args: { selected: false },
  argTypes: {
    selected: {
      control: "boolean",
      description: "État sélectionné (câble `aria-pressed`).",
      table: { category: "State", defaultValue: { summary: "false" } },
    },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Selectable Card — tuile/carte SÉLECTIONNABLE (preset, option, plateforme), avec `aria-pressed`. Le contenu (icône, texte) est libre. Distinct de Chip (petit filtre) et de Card (conteneur non-interactif)." } },
  },
};
export default meta;
type S = StoryObj<typeof SelectableCard>;

export const Playground: S = {
  render: (args) => (
    <SelectableCard {...args} className="w-56">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary"><Zap className="h-4 w-4" /></span>
        <span className="text-[14px] font-semibold">Preset Énergie</span>
      </div>
    </SelectableCard>
  ),
};

export const Unselected: S = { ...Playground, args: { selected: false }, argTypes: lock("selected") };
export const Selected: S = { ...Playground, args: { selected: true }, argTypes: lock("selected") };

export const SingleSelectGrid: S = {
  parameters: { controls: { disable: true } },
  render: () => {
    const presets = ["Découverte", "Croissance", "Performance"];
    const [active, setActive] = useState(0);
    return (
      <div className="grid w-[420px] grid-cols-3 gap-3">
        {presets.map((label, i) => (
          <SelectableCard key={label} selected={active === i} onClick={() => setActive(i)} className="text-center text-[12px] font-semibold">
            {label}
          </SelectableCard>
        ))}
      </div>
    );
  },
};
