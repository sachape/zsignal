import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const meta: Meta<typeof ToggleGroup> = {
  title: "Components/Actions/Toggle Group",
  component: ToggleGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: { description: { component: "Toggle Group — groupe de bascules liées. `type=\"single\"` = choix exclusif ; `type=\"multiple\"` = combinables. Chaque bouton icône porte un `aria-label`." } },
  },
};
export default meta;
type S = StoryObj<typeof ToggleGroup>;

export const Single: S = {
  render: () => (
    <ToggleGroup type="single" defaultValue="left" aria-label="Alignement du texte">
      <ToggleGroupItem value="left" aria-label="Aligner à gauche"><AlignLeft /></ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Centrer"><AlignCenter /></ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Aligner à droite"><AlignRight /></ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Multiple: S = {
  render: () => (
    <ToggleGroup type="multiple" aria-label="Options de mise en forme">
      <ToggleGroupItem value="left" aria-label="Aligner à gauche"><AlignLeft /></ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Centrer"><AlignCenter /></ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Aligner à droite"><AlignRight /></ToggleGroupItem>
    </ToggleGroup>
  ),
};
