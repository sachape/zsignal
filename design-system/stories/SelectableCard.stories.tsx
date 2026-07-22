import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Zap } from "lucide-react";
import { SelectableCard } from "@/components/ui/selectable-card";
import { lock } from "./_lockControls";
import { common, describe, CAT } from "./_argTypes";

const meta: Meta<typeof SelectableCard> = {
  title: "Components/Actions/Selectable Card",
  component: SelectableCard,
  tags: ["autodocs"],
  args: { selected: false, highlight: "tint" },
  argTypes: {
    ...common("children", "disabled", "onClick", "className"),
    highlight: describe(
      "`tint` teinte le fond à la sélection (tuiles de texte) ; `ring` pose un anneau sans fond teinté — à utiliser sur un aperçu image, qu'un fond laverait.",
      { control: "inline-radio", options: ["tint", "ring"], defaultValue: "tint" },
    ),
    selected: {
      control: "boolean",
      description: "État sélectionné (câble `aria-pressed`).",
      table: { category: "State", defaultValue: { summary: "false" } },
    },
    highlight: {
      control: "inline-radio",
      options: ["tint", "ring"],
      description: "Style de sélection : `tint` (fond teinté, tuiles de contenu) ou `ring` (anneau sans fond, tuiles image/média).",
      table: { category: "Appearance", defaultValue: { summary: "tint" } },
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
    <SelectableCard {...args} className="w-56 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary"><Zap className="h-4 w-4" /></span>
        <span className="text-[14px] font-semibold">Preset Énergie</span>
      </div>
    </SelectableCard>
  ),
};

export const Unselected: S = { ...Playground, args: { selected: false }, argTypes: lock("selected") };
export const Selected: S = { ...Playground, args: { selected: true }, argTypes: lock("selected") };

/** `highlight="ring"` : anneau sans fond teinté — pour les tuiles image/média (un tint laverait l'aperçu). */
export const MediaRing: S = {
  args: { highlight: "ring", selected: true },
  argTypes: lock("highlight"),
  render: (args) => (
    <SelectableCard {...args} aria-label="Style de sous-titre — Dynamique" className="w-40 overflow-hidden text-left">
      <div className="aspect-[9/10] w-full bg-gradient-to-br from-secondary to-muted" />
    </SelectableCard>
  ),
};

export const SingleSelectGrid: S = {
  parameters: { controls: { disable: true } },
  render: () => {
    const presets = ["Découverte", "Croissance", "Performance"];
    const [active, setActive] = useState(0);
    return (
      <div className="grid w-[420px] grid-cols-3 gap-3">
        {presets.map((label, i) => (
          <SelectableCard key={label} selected={active === i} onClick={() => setActive(i)} className="p-3 text-center text-[12px] font-semibold">
            {label}
          </SelectableCard>
        ))}
      </div>
    );
  },
};
