import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuShortcut, ContextMenuLabel,
} from "@/components/ui/context-menu";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof ContextMenu> = {
  title: "Components/Overlays/Context Menu",
  component: ContextMenu,
  tags: ["autodocs"],
  argTypes: {
    ...common("onOpenChange", "modal", "children"),
    dir: prop("Sens de lecture : inverse la direction des sous-menus.", { control: "inline-radio", options: ["ltr", "rtl"], category: CAT.layout }),
  },
  parameters: {
    layout: "centered",
    docs: { description: { component: "Context Menu — menu contextuel au clic droit sur une zone. Réserver aux raccourcis d'expert : l'action doit rester atteignable autrement (l'accès clavier/tactile au clic droit est limité)." } },
  },
};
export default meta;
type S = StoryObj<typeof ContextMenu>;

export const Default: S = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-32 w-72 items-center justify-center rounded-md border border-dashed text-[14px] text-muted-foreground">
        Clic droit ici
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuLabel>Clip</ContextMenuLabel>
        <ContextMenuItem>Renommer<ContextMenuShortcut>⌘R</ContextMenuShortcut></ContextMenuItem>
        <ContextMenuItem>Dupliquer<ContextMenuShortcut>⌘D</ContextMenuShortcut></ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Supprimer<ContextMenuShortcut>⌫</ContextMenuShortcut></ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};
