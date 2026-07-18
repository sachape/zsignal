import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Textarea — la saisie longue (9×) : description d'un clip, note, prompt. Même
 * traitement visuel que l'Input (surface « inset », focus ring token).
 */
const meta: Meta<typeof Textarea> = {
  title: "Primitives/Textarea",
  component: Textarea,
  parameters: { layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Textarea>;

export const Champ: S = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="desc">Description du clip</Label>
      <Textarea id="desc" placeholder="Ce moment où…" rows={4} />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText(/description du clip/i);
    await userEvent.type(field, "Un clutch en fin de round.");
    await expect(field).toHaveValue("Un clutch en fin de round.");
  },
};
