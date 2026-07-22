import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger,
  NavigationMenuContent, NavigationMenuLink, navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof NavigationMenu> = {
  title: "Components/Navigation/Navigation Menu",
  component: NavigationMenu,
  tags: ["autodocs"],
  argTypes: {
    ...common("value", "defaultValue", "onValueChange", "orientation", "children", "className"),
    delayDuration: prop("Temps de survol avant ouverture d'un sous-menu, en millisecondes.", { control: "number", category: CAT.state, defaultValue: "200" }),
    skipDelayDuration: prop("Fenêtre pendant laquelle passer d'un menu à l'autre reste instantané.", { control: "number", category: CAT.state, defaultValue: "300" }),
  },
  parameters: {
    layout: "centered",
    docs: { description: { component: "Navigation Menu — navigation principale avec sous-menus déroulants. Chaque entrée est un lien (`NavigationMenuLink`) ; navigation clavier native." } },
  },
};
export default meta;
type S = StoryObj<typeof NavigationMenu>;

export const Default: S = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Produit</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[280px] gap-1 p-3">
              <li><NavigationMenuLink href="#" className="block rounded-md p-2 text-[14px] hover:bg-secondary">Clips</NavigationMenuLink></li>
              <li><NavigationMenuLink href="#" className="block rounded-md p-2 text-[14px] hover:bg-secondary">Analyse</NavigationMenuLink></li>
              <li><NavigationMenuLink href="#" className="block rounded-md p-2 text-[14px] hover:bg-secondary">Planning</NavigationMenuLink></li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>Tarifs</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};
