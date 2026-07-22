import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const meta: Meta<typeof ChartContainer> = {
  title: "Components/Data Display/Chart",
  component: ChartContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: { description: { component: "Chart — enveloppe recharts pilotée par un `config` (label + couleur par série, branché sur les tokens). Tooltip et légende cohérents avec le DS." } },
  },
};
export default meta;
type S = StoryObj<typeof ChartContainer>;

const config = {
  clips: { label: "Clips", color: "hsl(var(--primary))" },
} as const;

const data = [
  { jour: "Lun", clips: 4 }, { jour: "Mar", clips: 7 }, { jour: "Mer", clips: 5 },
  { jour: "Jeu", clips: 9 }, { jour: "Ven", clips: 12 }, { jour: "Sam", clips: 8 },
];

export const Default: S = {
  render: () => (
    <ChartContainer config={config} className="h-56 w-[420px]">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="jour" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="clips" fill="var(--color-clips)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
};
