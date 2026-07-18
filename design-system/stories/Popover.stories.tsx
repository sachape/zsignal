import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * Popover — un panneau contextuel riche (mini-formulaire, réglages) ancré à un
 * déclencheur. Composé : Trigger + Content. Se ferme au clic extérieur / Échap.
 */
const meta: Meta<typeof Popover> = {
  title: "Primitives/Popover",
  component: Popover,
  parameters: { docs: { description: { component: "Popover — un panneau contextuel riche (mini-formulaire, réglages) ancré à un déclencheur. Composé : Trigger + Content." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Popover>;

export const Reglages: S = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Ajuster le seuil</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-medium">Détection de clips</p>
        <div className="grid gap-2">
          <Label htmlFor="thr">Seuil d'engagement</Label>
          <Input id="thr" defaultValue="60" />
        </div>
      </PopoverContent>
    </Popover>
  ),
  // Comportement : fermé → clic ouvre le panneau (porté → screen).
  play: async ({ canvas, userEvent }) => {
    await expect(screen.queryByText(/détection de clips/i)).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /ajuster le seuil/i }));
    await waitFor(() =>
      expect(screen.getByText(/détection de clips/i)).toBeVisible(),
    );
  },
};
