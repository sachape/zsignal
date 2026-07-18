import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

/**
 * Avatar — l'identité d'un streamer (9×). Composé : Avatar + Image + Fallback.
 * Le Fallback (initiales) s'affiche tant que l'image ne charge pas — utile quand
 * une chaîne n'a pas d'avatar.
 */
const meta: Meta<typeof Avatar> = {
  title: "Primitives/Avatar",
  component: Avatar,
  parameters: { controls: { disable: true }, docs: { description: { component: "Avatar — l'identité d'un streamer (9×). Composé : Avatar + Image + Fallback." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Avatar>;

export const AvecFallback: S = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://invalid.local/none.png" alt="Sacha" />
      <AvatarFallback>SP</AvatarFallback>
    </Avatar>
  ),
  // L'image ne charge pas (hôte injoignable) → les initiales prennent le relais.
  play: async ({ canvas }) => {
    await expect(canvas.getByText("SP")).toBeInTheDocument();
  },
};

export const Groupe: S = {
  render: () => (
    <div className="flex -space-x-2">
      {["TW", "YT", "TK", "+5"].map((i) => (
        <Avatar key={i} className="ring-2 ring-background">
          <AvatarFallback>{i}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  ),
};
