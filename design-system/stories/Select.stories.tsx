import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel,
} from "@/components/ui/select";

/**
 * Select — la brique de base des filtres (7×). Composé : Select + SelectTrigger
 * + SelectContent + SelectItem. Ouvert par défaut ici pour montrer le contenu.
 */
const meta: Meta<typeof Select> = {
  title: "Primitives/Select",
  component: Select,
  parameters: { layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Select>;

export const Plateforme: S = {
  render: () => (
    <Select defaultValue="twitch">
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Choisir une plateforme" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Plateformes</SelectLabel>
          <SelectItem value="twitch">Twitch</SelectItem>
          <SelectItem value="youtube">YouTube</SelectItem>
          <SelectItem value="tiktok">TikTok</SelectItem>
          <SelectItem value="instagram">Instagram</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Ouvert: S = {
  render: () => (
    <Select defaultValue="7d" open>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="24h">Dernières 24 h</SelectItem>
        <SelectItem value="7d">7 derniers jours</SelectItem>
        <SelectItem value="30d">30 derniers jours</SelectItem>
      </SelectContent>
    </Select>
  ),
};
