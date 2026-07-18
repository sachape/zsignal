import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup,
  CommandItem, CommandSeparator,
} from "@/components/ui/command";

/**
 * Command — la palette (Cmd+K) : recherche + actions rapides pour power users.
 * Ici en rendu inline (le composant), pas en CommandDialog, pour montrer le
 * filtrage. Le champ filtre la liste en direct.
 */
const meta: Meta<typeof Command> = {
  title: "Primitives/Command",
  component: Command,
  parameters: { controls: { disable: true }, docs: { description: { component: "Command — la palette (Cmd+K) : recherche + actions rapides pour power users. Ici en rendu inline (le composant), pas en CommandDialog, pour montrer le filtrage." } },  layout: "centered" },
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
