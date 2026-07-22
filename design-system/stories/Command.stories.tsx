import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import {
import { common, describe, CAT } from "./_argTypes";
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup,
  CommandItem, CommandSeparator,
} from "@/components/ui/command";

/**
 * Command — la palette (Cmd+K) : recherche + actions rapides pour power users.
 * Ici en rendu inline (le composant), pas en CommandDialog, pour montrer le
 * filtrage. Le champ filtre la liste en direct.
 */
const meta: Meta<typeof Command> = {
  title: "Components/Navigation/Command",
  component: Command,
  argTypes: {
    ...common("value", "onValueChange", "children", "className"),
    shouldFilter: describe("Filtrage automatique sur la saisie. Passer à `false` pour filtrer côté serveur.", { control: "boolean", category: CAT.state, defaultValue: "true" }),
    filter: describe("Fonction de score personnalisée : décide de la pertinence de chaque entrée.", { control: false, category: CAT.advanced }),
    loop: describe("La navigation repart en haut après la dernière entrée.", { control: "boolean", category: CAT.advanced }),
  },
  parameters: { docs: { description: { component: "Command — la palette (Cmd+K) : recherche + actions rapides pour power users. Ici en rendu inline (le composant), pas en CommandDialog, pour montrer le filtrage." } },  layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Command>;

export const Palette: S = {
  render: () => (
    <Command className="w-80 rounded-lg border border-border">
      <CommandInput placeholder="Rechercher une action…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Clips">
          <CommandItem>Générer des clips</CommandItem>
          <CommandItem>Voir la galerie</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Réseaux">
          <CommandItem>Connecter Twitch</CommandItem>
          <CommandItem>Publier un visuel</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
  // Comportement : taper filtre la liste (les items non-correspondants sortent).
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText(/voir la galerie/i)).toBeInTheDocument();
    await userEvent.type(canvas.getByPlaceholderText(/rechercher une action/i), "twitch");
    await waitFor(() => expect(canvas.queryByText(/voir la galerie/i)).toBeNull());
    await expect(canvas.getByText(/connecter twitch/i)).toBeInTheDocument();
  },
};
