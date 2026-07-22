import type { Meta, StoryObj } from "@storybook/react-vite";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { common, describe, CAT } from "./_argTypes";

const meta: Meta<typeof Carousel> = {
  title: "Components/Content & Structure/Carousel",
  component: Carousel,
  tags: ["autodocs"],
  argTypes: {
    ...common("orientation", "children", "className"),
    opts: describe("Options du moteur embla (boucle, alignement, nombre d'éléments par pas).", { control: false, category: CAT.advanced }),
    plugins: describe("Plugins embla (défilement automatique, roue de souris…).", { control: false, category: CAT.advanced }),
    setApi: describe("Reçoit l'instance embla pour piloter le carrousel depuis l'extérieur.", { control: false, category: CAT.events }),
  },
  parameters: {
    layout: "centered",
    docs: { description: { component: "Carousel — défilement horizontal d'éléments (embla). Boutons Précédent/Suivant avec nom accessible ; navigation clavier (flèches) native." } },
  },
};
export default meta;
type S = StoryObj<typeof Carousel>;

export const Default: S = {
  render: () => (
    <Carousel className="w-[280px]">
      <CarouselContent>
        {Array.from({ length: 5 }, (_, i) => (
          <CarouselItem key={i}>
            <div className="flex h-40 items-center justify-center rounded-md border text-[24px] font-semibold text-muted-foreground">
              {i + 1}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};
