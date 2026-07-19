import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Args = { side: "top" | "right" | "bottom" | "left"; align: "start" | "center" | "end" };

const meta: Meta<Args> = {
  title: "Components/Overlays/Popover",
  component: Popover,
  tags: ["autodocs"],
  args: { side: "bottom", align: "center" },
  argTypes: {
    side: { control: "inline-radio", options: ["top", "right", "bottom", "left"], description: "Côté d'ancrage (sur PopoverContent).", table: { category: "Placement" } },
    align: { control: "inline-radio", options: ["start", "center", "end"], description: "Alignement le long du côté.", table: { category: "Placement" } },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Popover — panneau contextuel riche (mini-formulaire, réglages) ancré à un déclencheur. Se ferme au clic extérieur / Échap." } },
  },
  render: (args) => (
    <Popover open>
      <PopoverTrigger asChild><Button variant="outline">Ajuster le seuil</Button></PopoverTrigger>
      <PopoverContent side={args.side} align={args.align} aria-label="Détection de clips" className="w-72 space-y-3">
        <p className="text-sm font-medium">Détection de clips</p>
        <div className="grid gap-2">
          <Label htmlFor="thr">Seuil d'engagement</Label>
          <Input id="thr" defaultValue="60" />
        </div>
      </PopoverContent>
    </Popover>
  ),
};
export default meta;
type S = StoryObj<Args>;

/** Exploration libre du placement (`side`, `align`). */
export const Playground: S = {};

/** Test : fermé → clic ouvre le panneau. */
export const Ouverture: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Popover>
      <PopoverTrigger asChild><Button variant="outline">Ajuster le seuil</Button></PopoverTrigger>
      <PopoverContent className="w-72" aria-label="Détection de clips"><p className="text-sm font-medium">Détection de clips</p></PopoverContent>
    </Popover>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(screen.queryByText(/détection de clips/i)).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /ajuster le seuil/i }));
    await waitFor(() => expect(screen.getByText(/détection de clips/i)).toBeVisible());
  },
};
