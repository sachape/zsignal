import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/**
 * DropdownMenu — les menus contextuels (actions, options). Composé : Trigger +
 * Content + Item/CheckboxItem/Separator. Ouvert par défaut pour le montrer.
 */
const meta: Meta<typeof DropdownMenu> = {
  title: "Primitives/DropdownMenu",
  component: DropdownMenu,
  parameters: { docs: { description: { component: "DropdownMenu — les menus contextuels (actions, options). Composé : Trigger + Content + Item/CheckboxItem/Separator." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof DropdownMenu>;

export const Actions: S = {
  render: () => (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions du clip</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Ce clip</DropdownMenuLabel>
        <DropdownMenuItem>Publier</DropdownMenuItem>
        <DropdownMenuItem>Télécharger</DropdownMenuItem>
        <DropdownMenuItem>Régénérer</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>Notifier à la fin</DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">Rejeter</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** Comportement : fermé → clic ouvre le menu → choisir un item le referme. */
export const OuvertureSelection: S = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions du clip</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>Publier</DropdownMenuItem>
        <DropdownMenuItem>Télécharger</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(screen.queryByRole("menu")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /actions du clip/i }));
    // Menu porté hors du canvas (portail) → screen.
    const item = await screen.findByRole("menuitem", { name: /publier/i });
    await userEvent.click(item);
    // Radix referme le menu au choix d'un item.
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  },
};
