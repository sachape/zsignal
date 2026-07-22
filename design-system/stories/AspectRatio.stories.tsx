import type { Meta, StoryObj } from "@storybook/react-vite";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof AspectRatio> = {
  title: "Components/Content & Structure/Aspect Ratio",
  component: AspectRatio,
  tags: ["autodocs"],
  args: { ratio: 16 / 9 },
  argTypes: {
    ...common("children", "className"),
    ratio: prop(
      "Rapport largeur/hauteur imposé au contenu (16/9 ≈ 1.78, 1 pour un carré). La hauteur se déduit de la largeur : le bloc ne saute plus quand l'image arrive.",
      { control: "number", category: CAT.layout, defaultValue: "16 / 9" },
    ),
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Aspect Ratio — maintient un rapport largeur/hauteur constant pour un média ou un bloc, quelle que soit la largeur du conteneur." } },
  },
};
export default meta;
type S = StoryObj<typeof AspectRatio>;

const Frame = ({ label }: { label: string }) => (
  <div className="flex h-full w-full items-center justify-center rounded-md bg-muted text-[14px] text-muted-foreground">
    {label}
  </div>
);

export const Playground: S = {
  render: (args) => (
    <div className="w-[360px]">
      <AspectRatio {...args}>
        <Frame label={(args.ratio ?? 0).toFixed(2)} />
      </AspectRatio>
    </div>
  ),
};

export const Widescreen: S = {
  args: { ratio: 16 / 9 },
  render: (args) => (
    <div className="w-[360px]">
      <AspectRatio {...args}><Frame label="16 / 9" /></AspectRatio>
    </div>
  ),
};

export const Square: S = {
  args: { ratio: 1 },
  render: (args) => (
    <div className="w-[240px]">
      <AspectRatio {...args}><Frame label="1 / 1" /></AspectRatio>
    </div>
  ),
};
