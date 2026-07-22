import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Bold, Italic, Underline } from "lucide-react";
import { ToggleButton } from "@/components/ui/toggle-button";
import { lock } from "./_lockControls";

const TOGGLE_BUTTON_VARIANTS = ["default", "ghost"] as const;
const TOGGLE_BUTTON_SIZES = ["sm", "default", "lg"] as const;

const meta: Meta<typeof ToggleButton> = {
  title: "Components/Actions/Toggle Button",
  component: ToggleButton,
  tags: ["autodocs"],
  args: { children: "Épingler", variant: "default", size: "default", disabled: false, "aria-label": "Épingler le clip" },
  argTypes: {
    children: { control: "text", description: "Contenu (texte ou icône).", table: { category: "Content" } },
    variant: { control: "select", options: TOGGLE_BUTTON_VARIANTS, description: "`default` = bordé (l'état off reste visible) ; `ghost` = sans bordure, réservé aux barres d'outils où l'entourage porte déjà l'affordance.", table: { category: "Appearance" } },
    size: { control: "select", options: TOGGLE_BUTTON_SIZES, description: "Gabarit du bouton.", table: { category: "Layout" } },
    disabled: { control: "boolean", description: "Désactive la bascule.", table: { category: "State" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: {
      description: {
        component:
          "Toggle Button — **bouton** à deux états, le « B / I / U » d'une barre d'outils. Rendu en `<button aria-pressed>` : il ressemble à un bouton, c'est voulu.\n\n⚠️ Ce n'est pas l'interrupteur coulissant. Pour un réglage on/off (« Mode sombre », « Notifications »), utiliser **Toggle**.",
      },
    },
  },
};
export default meta;
type S = StoryObj<typeof ToggleButton>;

export const Playground: S = {};

export const Default: S = { args: { variant: "default" }, argTypes: lock("variant") };
export const Ghost: S = { args: { variant: "ghost" }, argTypes: lock("variant") };
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
      {TOGGLE_BUTTON_SIZES.map((s) => (
        <ToggleButton key={s} size={s} aria-label={`Taille ${s}`}>{s}</ToggleButton>
      ))}
    </div>
  ),
};

/** Use case canonique : une barre d'outils de mise en forme. */
export const BarreDOutils: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-1 rounded-md border border-border p-1">
      <ToggleButton variant="ghost" size="sm" aria-label="Gras"><Bold className="h-4 w-4" /></ToggleButton>
      <ToggleButton variant="ghost" size="sm" aria-label="Italique"><Italic className="h-4 w-4" /></ToggleButton>
      <ToggleButton variant="ghost" size="sm" aria-label="Souligné"><Underline className="h-4 w-4" /></ToggleButton>
    </div>
  ),
};
