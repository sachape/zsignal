import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "@/components/ui/progress";

/**
 * Progress — l'avancement d'un rendu (génération de clips). Pour du > 10 s,
 * préférer une barre avec valeur plutôt qu'un spinner (cf. feedback d'interaction).
 */
const meta: Meta<typeof Progress> = {
  title: "Primitives/Progress",
  component: Progress,
  parameters: { docs: { description: { component: "Progress — l'avancement d'un rendu (génération de clips). Pour du > 10 s, préférer une barre avec valeur plutôt qu'un spinner." } },  layout: "centered" },
  argTypes: { value: { control: { type: "range", min: 0, max: 100, step: 1 } } },
};
export default meta;
type S = StoryObj<typeof Progress>;

/** Playground — fais varier `value` (0–100) avec le slider des contrôles. */
export const Playground: S = {
  render: (args) => <Progress {...args} className="w-72" />,
  args: { value: 60 },
};

export const Rendu: S = {
  render: () => (
    <div className="w-72 space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Génération des clips</span>
        <span>68 %</span>
      </div>
      <Progress value={68} />
    </div>
  ),
};
