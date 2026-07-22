import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle,
  DrawerDescription, DrawerFooter, DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { common, describe, CAT } from "./_argTypes";

const meta: Meta<typeof Drawer> = {
  title: "Components/Overlays/Drawer",
  component: Drawer,
  tags: ["autodocs"],
  argTypes: {
    ...common("open", "defaultOpen", "onOpenChange", "modal", "children"),
    direction: describe("Bord depuis lequel le panneau glisse.", { control: "select", options: ["top", "right", "bottom", "left"], category: CAT.layout, defaultValue: "bottom" }),
    dismissible: describe("Autorise la fermeture par glissement ou clic sur l'overlay. Passer à `false` pour une décision obligatoire.", { control: "boolean", category: CAT.state, defaultValue: "true" }),
    shouldScaleBackground: describe("Met la page en retrait à l'ouverture (effet iOS).", { control: "boolean", category: CAT.appearance }),
  },
  parameters: {
    layout: "centered",
    docs: { description: { component: "Drawer — panneau glissant depuis le bord (mobile-first). Toujours un `DrawerTitle` (nom accessible du dialogue) ; fermeture au clavier (Échap) et par overlay." } },
  },
};
export default meta;
type S = StoryObj<typeof Drawer>;

export const Default: S = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Ouvrir le panneau</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Publier le clip</DrawerTitle>
            <DrawerDescription>Choisis les plateformes de publication.</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button>Publier</Button>
            <DrawerClose asChild><Button variant="ghost">Annuler</Button></DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  ),
};
