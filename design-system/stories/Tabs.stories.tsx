import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * Tabs — vues liées d'un même objet. Composé : Tabs + TabsList + TabsTrigger +
 * TabsContent.
 */
const meta: Meta<typeof Tabs> = {
  title: "Primitives/Tabs",
  component: Tabs,
  parameters: { layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Tabs>;

export const TroisPiliers: S = {
  render: () => (
    <Tabs defaultValue="clips" className="w-96">
      <TabsList>
        <TabsTrigger value="clips">Clips</TabsTrigger>
        <TabsTrigger value="visuels">Visuels</TabsTrigger>
        <TabsTrigger value="score">StreamScore</TabsTrigger>
      </TabsList>
      <TabsContent value="clips" className="text-sm text-muted-foreground pt-3">
        3 clips détectés sur ton dernier live.
      </TabsContent>
      <TabsContent value="visuels" className="text-sm text-muted-foreground pt-3">
        2 visuels générés, prêts à publier.
      </TabsContent>
      <TabsContent value="score" className="text-sm text-muted-foreground pt-3">
        StreamScore : 88 — base solide.
      </TabsContent>
    </Tabs>
  ),
  // Comportement : "Clips" actif au départ → cliquer "Visuels" change le panneau.
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText(/3 clips détectés/i)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("tab", { name: /visuels/i }));
    await waitFor(() =>
      expect(canvas.getByText(/2 visuels générés/i)).toBeInTheDocument(),
    );
    // Radix démonte le panneau inactif : "Clips" n'est plus dans le DOM.
    await expect(canvas.queryByText(/3 clips détectés/i)).toBeNull();
  },
};
