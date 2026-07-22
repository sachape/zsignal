import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { common, describe, CAT } from "./_argTypes";

/**
 * Label — l'étiquette d'un champ (18×). Toujours associée à un contrôle via
 * `htmlFor` : cliquer le label focalise le champ (accessibilité + confort).
 * Rarement seule — montrée ici avec un Input pour illustrer le lien.
 */
const meta: Meta<typeof Label> = {
  title: "Components/Forms/Label",
  component: Label,
  argTypes: {
    ...common("children", "className"),
    htmlFor: describe(
      "Identifiant du contrôle décrit. C'est ce lien qui rend le label cliquable et annonçable — sans lui, le champ n'a pas de nom accessible.",
      { control: "text", category: CAT.content },
    ),
  },
  parameters: {
    layout: "centered",
    controls: { sort: "requiredFirst" },
    docs: { description: { component: "Label — l'étiquette d'un champ (18×). Toujours associée à un contrôle via htmlFor : cliquer le label focalise le champ (accessibilité + confort)." } },
  },
};
export default meta;
type S = StoryObj<typeof Label>;

export const AssocieAuChamp: S = {
  render: () => (
    <div className="grid gap-2 w-72">
      <Label htmlFor="pseudo">Pseudo Twitch</Label>
      <Input id="pseudo" placeholder="ex. tonpseudo" />
    </div>
  ),
  // Comportement : cliquer le label focalise le champ lié (htmlFor).
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByText(/pseudo twitch/i));
    await expect(canvas.getByLabelText(/pseudo twitch/i)).toHaveFocus();
  },
};
