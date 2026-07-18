import type { Meta, StoryObj } from "@storybook/react-vite";
import ProgressRow from "@/components/ProgressRow";
import { lock } from "./_lockControls";

const meta: Meta<typeof ProgressRow> = {
  title: "Patterns/ProgressRow",
  component: ProgressRow,
  tags: ["autodocs"],
  args: { label: "Spectateurs moyens", value: "72 / 75", pct: 96, tinted: false },
  argTypes: {
    label: { control: "text", table: { category: "Content" } },
    value: { control: "text", description: "Texte « actuel / cible ».", table: { category: "Content" } },
    pct: { control: { type: "range", min: 0, max: 100 }, description: "Remplissage (0–100). En mode tinté, détermine le palier.", table: { category: "State" } },
    tinted: { control: "boolean", description: "Si vrai, la couleur suit le palier StreamScore (bas/moyen/haut).", table: { category: "Appearance" } },
  },
  parameters: {
    layout: "padded",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "ProgressRow — barre KPI « actuel / cible ». Avec `tinted`, la couleur de remplissage suit les paliers StreamScore." } },
  },
  render: (args) => <div className="w-80"><ProgressRow {...args} /></div>,
};
export default meta;
type S = StoryObj<typeof ProgressRow>;

/** Exploration libre. */
export const Playground: S = {};

/** Appearance neutre : remplissage lime, indépendant du palier. */
export const Neutre: S = { args: { tinted: false }, argTypes: lock("tinted") };

/** Appearance tinté : la couleur suit le palier (fais varier pct pour le voir). */
export const Tinte: S = { args: { tinted: true, label: "Régularité", value: "62 / 100", pct: 62 }, argTypes: lock("tinted") };

/** Matrice : les 3 paliers du mode tinté. */
export const AllTiers: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="w-80 space-y-4">
      <ProgressRow label="Bas" value="24 / 100" pct={24} tinted />
      <ProgressRow label="Moyen" value="54 / 100" pct={54} tinted />
      <ProgressRow label="Haut" value="88 / 100" pct={88} tinted />
    </div>
  ),
};
