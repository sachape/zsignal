import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Toggle } from "@/components/ui/toggle";
import { lock } from "./_lockControls";

const TOGGLE_VARIANTS = ["default", "outline"] as const;
const TOGGLE_SIZES = ["sm", "default", "lg"] as const;

const meta: Meta<typeof Toggle> = {
  title: "Components/Actions/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  args: { children: "Épingler", variant: "default", size: "default", disabled: false, "aria-label": "Épingler le clip" },
  argTypes: {
    children: { control: "text", description: "Contenu (texte ou icône).", table: { category: "Content" } },
    variant: { control: "select", options: TOGGLE_VARIANTS, description: "Style visuel (plein ou contour).", table: { category: "Appearance" } },
    size: { control: "select", options: TOGGLE_SIZES, description: "Taille du bouton.", table: { category: "Layout" } },
    disabled: { control: "boolean", description: "Désactive la bascule.", table: { category: "State" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Toggle — bouton à deux états (activé/non), ex. épingler un clip. Distinct du Switch : c'est une action, pas un réglage de formulaire." } },
  },
};
export default meta;
type S = StoryObj<typeof Toggle>;

export const Playground: S = {};

export const Default: S = { args: { variant: "default" }, argTypes: lock("variant") };
export const Outline: S = { args: { variant: "outline" }, argTypes: lock("variant") };
export const Disabled: S = { args: { disabled: true }, argTypes: lock("disabled") };

export const Pressed: S = {
  args: { defaultPressed: true },
  argTypes: lock("defaultPressed"),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  },
};

export const Sizes: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-3">
      {TOGGLE_SIZES.map((s) => (
        <Toggle key={s} size={s} aria-label={`Taille ${s}`}>{s}</Toggle>
      ))}
    </div>
  ),
};
