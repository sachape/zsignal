import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Menubar, MenubarMenu, MenubarTrigger, MenubarContent,
  MenubarItem, MenubarSeparator, MenubarShortcut,
} from "@/components/ui/menubar";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof Menubar> = {
  title: "Components/Navigation/Menubar",
  component: Menubar,
  tags: ["autodocs"],
  argTypes: {
    ...common("value", "defaultValue", "onValueChange", "children", "className"),
    loop: prop("Le focus repart au début après le dernier menu.", { control: "boolean", category: CAT.advanced }),
    dir: prop("Sens de lecture : inverse l'ouverture des sous-menus.", { control: "inline-radio", options: ["ltr", "rtl"], category: CAT.layout }),
  },
  parameters: {
    layout: "centered",
    docs: { description: { component: "Menubar — barre de menus persistante façon application desktop. Navigation clavier native (flèches) ; à réserver aux interfaces denses type éditeur." } },
  },
};
export default meta;
type S = StoryObj<typeof Menubar>;

export const Default: S = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Fichier</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Nouveau clip<MenubarShortcut>⌘N</MenubarShortcut></MenubarItem>
          <MenubarItem>Importer une VOD</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Exporter</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Édition</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Annuler<MenubarShortcut>⌘Z</MenubarShortcut></MenubarItem>
          <MenubarItem>Rétablir<MenubarShortcut>⇧⌘Z</MenubarShortcut></MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
};
