import type { Meta, StoryObj } from "@storybook/react-vite";
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
  parameters: { layout: "centered" },
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
