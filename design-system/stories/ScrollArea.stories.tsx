import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollArea } from "@/components/ui/scroll-area";

const meta: Meta<typeof ScrollArea> = {
  title: "Components/Content & Structure/Scroll Area",
  component: ScrollArea,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: { description: { component: "Scroll Area — zone défilable à barre stylée et cohérente cross-plateforme, sans casser le défilement natif ni l'accessibilité clavier." } },
  },
};
export default meta;
type S = StoryObj<typeof ScrollArea>;

export const Default: S = {
  render: () => (
    <ScrollArea className="h-56 w-64 rounded-md border p-4">
      <div className="space-y-2">
        {Array.from({ length: 25 }, (_, i) => (
          <p key={i} className="text-[14px] text-muted-foreground">Clip #{i + 1} — StreamScore {60 + i}</p>
        ))}
      </div>
    </ScrollArea>
  ),
};
