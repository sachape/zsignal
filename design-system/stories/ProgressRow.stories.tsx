import type { Meta, StoryObj } from "@storybook/react-vite";
import ProgressRow from "@/components/ProgressRow";

/**
 * ProgressRow — barre KPI « actuel / cible » standardisée (3×) : progression
 * affiliation, objectifs. Avec `tinted`, la couleur de remplissage suit les
 * paliers StreamScore (bas/moyen/haut) — le même signal que le score.
 */
const meta: Meta<typeof ProgressRow> = {
  title: "Patterns/ProgressRow",
  component: ProgressRow,
  parameters: { layout: "padded" },
};
export default meta;
type S = StoryObj<typeof ProgressRow>;

export const Neutre: S = {
  render: (args) => (
    <div className="w-80">
      <ProgressRow {...args} />
    </div>
  ),
  args: { label: "Spectateurs moyens", value: "72 / 75", pct: 96 },
};

/** Tinté : la couleur suit le palier StreamScore (ici bas → destructive). */
export const TinteBas: S = {
  render: (args) => (
    <div className="w-80">
      <ProgressRow {...args} />
    </div>
  ),
  args: { label: "Régularité", value: "24 / 100", pct: 24, tinted: true },
};

export const TinteHaut: S = {
  render: (args) => (
    <div className="w-80">
      <ProgressRow {...args} />
    </div>
  ),
  args: { label: "Engagement", value: "88 / 100", pct: 88, tinted: true },
};
