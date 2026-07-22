import type { Meta, StoryObj } from "@storybook/react-vite";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

const meta: Meta<typeof Carousel> = {
  title: "Components/Content & Structure/Carousel",
  component: Carousel,
  tags: ["autodocs"],
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
