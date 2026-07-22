import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";

const meta: Meta<typeof SegmentedControl> = {
  title: "Components/Actions/Segmented Control",
  component: SegmentedControl,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: { description: { component: "Segmented Control — sélection UNIQUE dans un groupe (onglets/segments), un seul actif. `role=radiogroup`/`radio`. Distinct de Chip (filtre pill), Tabs (bascule de vues) et RadioGroup (liste verticale)." } },
  },
};
export default meta;
type S = StoryObj<typeof SegmentedControl>;

const Demo = ({ options }: { options: string[] }) => {
  const [value, setValue] = useState(options[0]);
  return (
    <SegmentedControl value={value} onValueChange={setValue}>
      {options.map((o) => (
        <SegmentedControlItem key={o} value={o}>{o}</SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
};

export const Default: S = { render: () => <Demo options={["Récents", "Populaires", "Score"]} /> };
export const TwoOptions: S = { render: () => <Demo options={["Twitch", "YouTube"]} /> };
