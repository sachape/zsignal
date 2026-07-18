import type { Meta, StoryObj } from "@storybook/react-vite";
import ScoreCard from "@/components/ScoreCard";

/**
 * ScoreCard — l'implémentation actuelle du pattern `ScoreDisplay`
 * (voir design-system/specs/score-display.md). Montre les 3 paliers via
 * `streamScoreTier` : bas → destructive (P4), moyen → warning, haut → primary.
 * Et l'état `locked` : neutre, jamais une couleur de palier.
 */
const meta: Meta<typeof ScoreCard> = {
  title: "Patterns/ScoreDisplay (ScoreCard)",
  component: ScoreCard,
  parameters: { docs: { description: { component: "ScoreCard — l'implémentation actuelle du pattern ScoreDisplay (voir design-system/specs/score-display.md). Montre les 3 paliers via streamScoreTier : bas → destructive (P4), moyen → warning, haut → primary." } },  layout: "centered" },
  argTypes: {
    score: { control: { type: "range", min: 0, max: 100 } },
    locked: { control: "boolean" },
  },
};
export default meta;
type S = StoryObj<typeof ScoreCard>;

export const Haut: S = { args: { score: 88, label: "StreamScore" } };
export const Moyen: S = { args: { score: 54, label: "StreamScore" } };
export const Bas: S = { args: { score: 18, label: "StreamScore" } };
export const Locked: S = { args: { score: 62, label: "StreamScore", locked: true } };
