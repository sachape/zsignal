import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * FilterBar — un **exemple d'usage**, pas une primitive : les filtres se
 * COMPOSENT (Select + Input + Badge). Montre comment les primitives du DS se
 * combinent pour une barre de filtres — le motif « filtres » que tu cherchais.
 */
function FilterBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 w-[640px]">
      <Select defaultValue="all">
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes plateformes</SelectItem>
          <SelectItem value="twitch">Twitch</SelectItem>
          <SelectItem value="youtube">YouTube</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="7d">
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="24h">24 h</SelectItem>
          <SelectItem value="7d">7 jours</SelectItem>
          <SelectItem value="30d">30 jours</SelectItem>
        </SelectContent>
      </Select>
      <Input placeholder="Rechercher un clip…" className="flex-1 min-w-40" />
      <Badge variant="secondary">3 actifs</Badge>
      <Button variant="ghost" size="sm">Réinitialiser</Button>
    </div>
  );
}

const meta: Meta<typeof FilterBar> = {
  title: "Exemples/FilterBar",
  component: FilterBar,
  parameters: { docs: { description: { component: "FilterBar — un **exemple d'usage**, pas une primitive : les filtres se COMPOSENT (Select + Input + Badge). Montre comment les primitives du DS se combinent pour une barre de filtres — le motif « filtres » que tu cherchais." } },  layout: "centered" },
};
export default meta;

export const Default: StoryObj<typeof FilterBar> = {};
