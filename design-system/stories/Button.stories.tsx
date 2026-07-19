import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { Sparkles, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lock } from "./_lockControls";

// Source de vérité : miroir des variantes/tailles CVA de button.tsx (§7).
// L'API est celle de shadcn : "default" (pas "primary"), pas de "loading".
const BUTTON_VARIANTS = [
  "default", "secondary", "outline", "ghost", "destructive",
  "destructive-outline", "success", "warning", "link", "twitch",
] as const;
const BUTTON_SIZES = ["default", "sm", "lg", "icon"] as const;

const meta: Meta<typeof Button> = {
  title: "Components/Actions/Button",
  component: Button,
  tags: ["autodocs"],
  // Valeurs de rendu par défaut (§8) — chaque story ne surcharge que le nécessaire.
  args: { children: "Button", variant: "default", size: "default", disabled: false, onClick: fn() },
  argTypes: {
    children: { control: "text", description: "Contenu visible du bouton.", table: { category: "Content" } },
    variant: {
      control: "select", options: BUTTON_VARIANTS,
      description: "Rôle visuel et sémantique. `default` = action principale (lime).",
      table: { category: "Appearance", defaultValue: { summary: "default" } },
    },
    size: {
      control: "select", options: BUTTON_SIZES,
      description: "Hauteur et paddings. `icon` = bouton carré sans texte.",
      table: { category: "Layout", defaultValue: { summary: "default" } },
    },
    disabled: { control: "boolean", description: "Désactive toute interaction.", table: { category: "State" } },
    asChild: { control: false, description: "Rend l'enfant comme élément racine (Slot). Composition avancée.", table: { category: "Advanced" } },
    onClick: { control: false, description: "Callback à l'activation.", table: { category: "Events" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Button — déclenche une action ou confirme une décision. Toutes les couleurs viennent des tokens ; `default` porte la marque lime." } },
  },
};
export default meta;
type S = StoryObj<typeof Button>;

/** Exploration libre : tous les Controls actifs. */
export const Playground: S = {};

// ── Variantes (propriété d'identité `variant` verrouillée) ────────────────
export const Default: S = { args: { variant: "default", children: "Générer les clips" }, argTypes: lock("variant") };
export const Secondary: S = { args: { variant: "secondary", children: "Annuler" }, argTypes: lock("variant") };
export const Outline: S = { args: { variant: "outline", children: "Voir les détails" }, argTypes: lock("variant") };
export const Ghost: S = { args: { variant: "ghost", children: "Passer" }, argTypes: lock("variant") };
export const Destructive: S = { args: { variant: "destructive", children: "Supprimer le projet" }, argTypes: lock("variant") };
export const Link: S = { args: { variant: "link", children: "En savoir plus" }, argTypes: lock("variant") };

// ── État (identité `disabled` verrouillée) ────────────────────────────────
export const Disabled: S = {
  args: { disabled: true, children: "Indisponible" },
  argTypes: lock("disabled"),
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: /indisponible/i });
    await expect(button).toBeDisabled();
    // shadcn met pointer-events:none ; on force le clic pour prouver que
    // l'attribut disabled natif bloque quand même le handler.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

// ── Icônes ────────────────────────────────────────────────────────────────
export const WithIcon: S = {
  args: { children: "Ajouter un clip" },
  render: (args) => <Button {...args}><Sparkles /> {args.children}</Button>,
};

/** Icône seule : `size="icon"` + `aria-label` obligatoire (nom accessible). */
export const IconOnly: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex gap-2">
      <Button size="icon" aria-label="Télécharger"><Download /></Button>
      <Button size="icon" variant="secondary" aria-label="Ajouter"><Plus /></Button>
      <Button size="icon" variant="outline" aria-label="Ajouter"><Plus /></Button>
    </div>
  ),
};

// ── Matrices (Controls désactivés : plusieurs instances) ──────────────────
export const Sizes: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const AllVariants: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(["default", "secondary", "outline", "ghost", "destructive", "link"] as const).map((v) => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </div>
  ),
};

// ── Tests d'interaction : clic ET activation clavier ──────────────────────
export const ClickInteraction: S = {
  args: { children: "Générer les clips", onClick: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /générer les clips/i }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const KeyboardActivation: S = {
  args: { children: "Générer les clips", onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: /générer les clips/i });
    button.focus();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
};
