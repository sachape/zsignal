import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof Tabs> = {
  title: "Components/Navigation/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  args: { defaultValue: "clips", orientation: "horizontal" },
  argTypes: {
    ...common("value", "onValueChange", "orientation", "className"),
    defaultValue: prop("Onglet actif au montage, en mode non contrôlé.", { control: "select", options: ["clips", "visuels", "score"], category: CAT.state }),
    activationMode: prop(
      "`automatic` change d'onglet au simple déplacement du focus ; `manual` attend Entrée ou Espace — à préférer si le contenu est coûteux à charger.",
      { control: "inline-radio", options: ["automatic", "manual"], category: CAT.advanced, defaultValue: "automatic" },
    ),
    orientation: {
      control: "inline-radio", options: ["horizontal", "vertical"],
      description: "Sens de la liste d'onglets.",
      table: { category: "Layout", defaultValue: { summary: "horizontal" } },
    },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Tabs — vues liées d'un même objet. Composé : Tabs + TabsList + TabsTrigger + TabsContent." } },
  },
  render: (args) => (
    <Tabs {...args} className="w-96">
      <TabsList>
        <TabsTrigger value="clips">Clips</TabsTrigger>
        <TabsTrigger value="visuels">Visuels</TabsTrigger>
        <TabsTrigger value="score">StreamScore</TabsTrigger>
      </TabsList>
      <TabsContent value="clips" className="text-sm text-muted-foreground pt-3">3 clips détectés sur ton dernier live.</TabsContent>
      <TabsContent value="visuels" className="text-sm text-muted-foreground pt-3">2 visuels générés, prêts à publier.</TabsContent>
      <TabsContent value="score" className="text-sm text-muted-foreground pt-3">StreamScore : 88 — base solide.</TabsContent>
    </Tabs>
  ),
};
export default meta;
type S = StoryObj<typeof Tabs>;

/** Exploration libre (`defaultValue`, `orientation`). */
export const Playground: S = {};

/** Orientation verticale (identité verrouillée). */
export const Vertical: S = { args: { orientation: "vertical" }, argTypes: { orientation: { control: false } } };

/** Test : changer d'onglet change le panneau. */
export const ChangementOnglet: S = {
  parameters: { controls: { disable: true } },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText(/3 clips détectés/i)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("tab", { name: /visuels/i }));
    await waitFor(() => expect(canvas.getByText(/2 visuels générés/i)).toBeInTheDocument());
    await expect(canvas.queryByText(/3 clips détectés/i)).toBeNull();
  },
};
