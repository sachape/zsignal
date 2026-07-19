import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { lock } from "./_lockControls";

const meta: Meta<typeof Textarea> = {
  title: "Components/Forms/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: { placeholder: "Ce moment où…", disabled: false, readOnly: false, rows: 4, "aria-label": "Zone de texte" },
  argTypes: {
    placeholder: { control: "text", table: { category: "Content" } },
    rows: { control: { type: "number", min: 2, max: 12 }, description: "Hauteur en lignes.", table: { category: "Layout" } },
    disabled: { control: "boolean", table: { category: "State" } },
    readOnly: { control: "boolean", table: { category: "State" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Textarea — saisie longue (description de clip, note, prompt). Même traitement visuel que l'Input." } },
  },
  render: (args) => <Textarea {...args} className="w-80" />,
};
export default meta;
type S = StoryObj<typeof Textarea>;

export const Playground: S = {};

export const Filled: S = { args: { defaultValue: "Un clutch en fin de round.", placeholder: undefined } };
export const Disabled: S = { args: { disabled: true, defaultValue: "Non éditable" }, argTypes: lock("disabled") };

export const AvecLabel: S = {
  render: () => (
    <div className="grid gap-2 w-80">
      <Label htmlFor="desc">Description du clip</Label>
      <Textarea id="desc" placeholder="Ce moment où…" rows={4} />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText(/description du clip/i);
    await userEvent.type(field, "Un clutch.");
    await expect(field).toHaveValue("Un clutch.");
  },
};
