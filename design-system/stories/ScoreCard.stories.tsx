import type { Meta, StoryObj } from "@storybook/react-vite";
import ScoreCard from "@/components/ScoreCard";
import { lock } from "./_lockControls";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof ScoreCard> = {
  title: "Patterns/ScoreDisplay (ScoreCard)",
  component: ScoreCard,
  tags: ["autodocs"],
  args: { score: 88, label: "StreamScore", locked: false },
  argTypes: {
    score: { control: { type: "range", min: 0, max: 100 }, description: "Note 0–100. Détermine le palier de couleur (bas/moyen/haut).", table: { category: "State" } },
    label: prop("Nom de la métrique affichée sous la note.", { control: "text", category: CAT.content }),
    ...common("className"),
    locked: { control: "boolean", description: "État verrouillé : couleur neutre, jamais un palier.", table: { category: "State" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "ScoreCard — implémentation du pattern ScoreDisplay. 3 paliers via streamScoreTier : bas → destructive, moyen → warning, haut → primary ; `locked` → neutre." } },
  },
};
export default meta;
type S = StoryObj<typeof ScoreCard>;

/** Exploration libre (bouge `score` pour voir les paliers changer). */
export const Playground: S = {};

// Paliers : le `score` est verrouillé pour que le nom reste vrai.
export const Haut: S = { args: { score: 88 }, argTypes: lock("score") };
export const Moyen: S = { args: { score: 54 }, argTypes: lock("score") };
export const Bas: S = { args: { score: 18 }, argTypes: lock("score") };

/** État verrouillé : couleur neutre quel que soit le score. */
export const Locked: S = { args: { score: 62, locked: true }, argTypes: lock("locked") };
