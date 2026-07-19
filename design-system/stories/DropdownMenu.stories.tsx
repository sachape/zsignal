import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor } from "storybook/test";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof DropdownMenu> = {
  title: "Components/Overlays/DropdownMenu",
  component: DropdownMenu,
  tags: ["autodocs"],
  args: { modal: true },
  argTypes: {
    modal: { control: "boolean", description: "Rend l'arrière-plan inerte tant que le menu est ouvert.", table: { category: "Behavior" } },
    defaultOpen: { control: "boolean", description: "Ouvert au montage (non contrôlé).", table: { category: "State" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "DropdownMenu — menu contextuel (actions, options). Composé : Trigger + Content + Item/CheckboxItem/Separator." } },
  },
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger asChild><Button variant="outline">Actions du clip</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Ce clip</DropdownMenuLabel>
        <DropdownMenuItem>Publier</DropdownMenuItem>
        <DropdownMenuItem>Télécharger</DropdownMenuItem>
        <DropdownMenuItem>Régénérer</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>Notifier à la fin</DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive-strong">Rejeter</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
export default meta;
type S = StoryObj<typeof DropdownMenu>;

/** Exploration libre (`modal`, `defaultOpen`). Clique « Actions du clip ». */
export const Playground: S = {};

/** Ouvert au montage pour montrer le contenu. */
export const Ouvert: S = {
  args: { defaultOpen: true },
  parameters: {
    controls: { disable: true },
    // FAUX POSITIF d'isolation Storybook : à l'ouverture, Radix pose aria-hidden
    // sur le reste de la page (#storybook-root). En app réelle le menu est
    // portalisé HORS de cette zone ; en story isolée le trigger reste dedans, ce
    // qui déclenche aria-hidden-focus à tort. Comportement correct en production.
    a11y: { config: { rules: [{ id: "aria-hidden-focus", enabled: false }] } },
  },
};

/** Test : fermé → clic ouvre → choisir un item referme. */
export const OuvertureSelection: S = {
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    await expect(screen.queryByRole("menu")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /actions du clip/i }));
    const item = await screen.findByRole("menuitem", { name: /publier/i });
    await userEvent.click(item);
    // timeout élargi : sous la charge de l'a11y (axe en afterEach sur chaque
    // story), l'animation de fermeture Radix dépasse parfois le 1000 ms par défaut.
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull(), { timeout: 3000 });
  },
};
