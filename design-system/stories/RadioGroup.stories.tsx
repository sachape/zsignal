import type { Meta, StoryObj } from "@storybook/react-vite";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const meta: Meta<typeof RadioGroup> = {
  title: "Components/Forms/Radio Group",
  component: RadioGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: { description: { component: "Radio Group — choix unique parmi plusieurs options mutuellement exclusives. Chaque option est associée à un `Label` (nom accessible) ; navigation clavier native." } },
  },
};
export default meta;
type S = StoryObj<typeof RadioGroup>;

export const Default: S = {
  render: () => (
    <RadioGroup defaultValue="twitch" className="space-y-2">
      {[
        { id: "r-twitch", value: "twitch", label: "Twitch" },
        { id: "r-youtube", value: "youtube", label: "YouTube" },
        { id: "r-tiktok", value: "tiktok", label: "TikTok" },
      ].map((o) => (
        <div key={o.value} className="flex items-center gap-2">
          <RadioGroupItem id={o.id} value={o.value} />
          <Label htmlFor={o.id}>{o.label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
};
