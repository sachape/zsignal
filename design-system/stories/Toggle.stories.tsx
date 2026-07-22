import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { Captions, Moon } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { lock } from "./_lockControls";

const meta: Meta<typeof Toggle> = {
  title: "Components/Forms/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  args: {
    label: "Sous-titres automatiques",
    description: "Ajoute les sous-titres quand tu parles. Incrustés dans la vidéo.",
    defaultChecked: false,
    disabled: false,
    onCheckedChange: fn(),
  },
  argTypes: {
    label: { control: "text", description: "Libellé visible. Cliquer dessus bascule l'interrupteur.", table: { category: "Content" } },
    description: { control: "text", description: "Précision sous le libellé — la conséquence du réglage, pas sa répétition.", table: { category: "Content" } },
    icon: { control: false, description: "Icône décorative devant le libellé (masquée aux lecteurs d'écran).", table: { category: "Content" } },
    defaultChecked: { control: "boolean", description: "État initial (on/off).", table: { category: "State" } },
    disabled: { control: "boolean", description: "Désactive le réglage et atténue la ligne entière.", table: { category: "State" } },
    onCheckedChange: { control: false, description: "Callback au changement d'état.", table: { category: "Events" } },
  },
  parameters: {
    layout: "padded",
    controls: { sort: "requiredFirst" },
    docs: {
      description: {
        component:
          "Toggle — **réglage on/off** : l'interrupteur coulissant avec son libellé. Effet immédiat, sans validation.\n\nLa liaison `htmlFor` / `aria-describedby` est faite par construction : un interrupteur muet au lecteur d'écran n'est plus possible.\n\n⚠️ Distinct de **Toggle Button** (bouton bascule type gras/italique) et de **Checkbox** (choix à valider dans un formulaire).",
      },
    },
  },
  decorators: [(Story) => <div className="max-w-md">{Story()}</div>],
};
export default meta;
type S = StoryObj<typeof Toggle>;

export const Playground: S = {};

/** Le cas le plus courant : un libellé, rien de plus. */
export const Simple: S = {
  args: { label: "Notifications", description: undefined },
  argTypes: lock("description"),
};

export const AvecDescription: S = { args: { defaultChecked: true } };

export const AvecIcone: S = {
  args: { label: "Apparence", description: "Bascule entre le thème clair et sombre.", icon: <Moon className="h-4 w-4" /> },
};

export const Active: S = { args: { defaultChecked: true }, argTypes: lock("defaultChecked") };
export const Inactive: S = { args: { defaultChecked: false }, argTypes: lock("defaultChecked") };
export const Disabled: S = { args: { disabled: true, defaultChecked: true }, argTypes: lock("disabled") };

/** Le libellé est bien relié : cliquer sur le texte bascule l'interrupteur. */
export const LeLabelBascule: S = {
  args: { icon: <Captions className="h-4 w-4" /> },
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole("switch", { name: "Sous-titres automatiques" });
    await expect(toggle).not.toBeChecked();

    await userEvent.click(canvas.getByText("Sous-titres automatiques"));
    await expect(toggle).toBeChecked();
  },
};

/** Use case : un panneau de réglages — l'alignement tient sur toute la colonne. */
export const Panneau: S = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="space-y-4 rounded-md border border-border p-4">
      <Toggle label="Sous-titres automatiques" description="Incrustés dans la vidéo." defaultChecked />
      <Toggle label="Programmer la publication" description="Sinon, publiée maintenant." />
      <Toggle label="Recadrage facecam" description="Non disponible sur ce format." disabled />
    </div>
  ),
};
