import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle,
  DrawerDescription, DrawerFooter, DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof Drawer> = {
  title: "Components/Overlays/Drawer",
  component: Drawer,
  tags: ["autodocs"],
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
