import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "@/components/ui/progress";
import { lock } from "./_lockControls";

const meta: Meta<typeof Progress> = {
  title: "Primitives/Progress",
  component: Progress,
  tags: ["autodocs"],
  args: { value: 60 },
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description: "Avancement, de 0 à 100.",
      table: { category: "State", defaultValue: { summary: "0" } },
    },
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Progress — avancement d'une tâche (génération de clips). Pour du > 10 s, préférer une barre avec valeur à un spinner." } },
  },
  render: (args) => <Progress {...args} aria-label="Progression" className="w-72" />,
};
export default meta;
type S = StoryObj<typeof Progress>;

export const Playground: S = {};

export const Empty: S = { args: { value: 0 }, argTypes: lock("value") };
export const Partial: S = { args: { value: 60 }, argTypes: lock("value") };
export const Complete: S = { args: { value: 100 }, argTypes: lock("value") };

/** Use case : barre étiquetée avec le pourcentage. */
export const AvecLabel: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="w-72 space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Génération des clips</span><span>68 %</span>
      </div>
      <Progress value={68} aria-label="Génération des clips" />
    </div>
  ),
};
