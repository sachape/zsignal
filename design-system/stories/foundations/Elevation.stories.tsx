import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Elevation — hiérarchie des surfaces. En dark, plus haut = plus
 * clair (quelques % de luminosité) ; on ressent l'empilement plus qu'on ne le voit.
 */

const LEVELS = [
  { cls: "bg-background", label: "0 · Canvas", role: "Fond de page" },
  { cls: "bg-card", label: "1 · Card", role: "Cartes, panneaux" },
  { cls: "bg-popover", label: "2 · Popover", role: "Menus, dropdowns, tooltips" },
  { cls: "bg-muted", label: "3 · Muted", role: "Surfaces enfoncées / secondaires" },
];

function Elevation() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Elevation</h1>
        <p className="text-sm text-muted-foreground">
          Les surfaces s'empilent : un dropdown est au-dessus d'une carte, elle-même au-dessus du canvas.
          Sidebars = même fond que le canvas + une bordure (pas une couleur différente).
        </p>
      </header>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {LEVELS.map((l) => (
          <div key={l.label} className={`flex flex-col gap-2 rounded-xl border border-border p-6 ${l.cls}`}>
            <span className="text-sm font-medium text-foreground">{l.label}</span>
            <span className="text-xs text-muted-foreground">{l.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof Elevation> = {
  title: "Foundations/Elevation",
  component: Elevation,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Elevation> = {};
