import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Shadows — l'échelle d'ombres (tokens --shadow-xs → xl) mappée aux
 * niveaux d'élévation. En dark l'ombre porte peu : on s'appuie surtout sur la
 * bordure + le shift de surface (voir Foundations/Elevation).
 */

const SHADOWS = [
  { tok: "xs", cls: "shadow-sm", elev: "0-1 · éléments posés", use: "Boutons, chips" },
  { tok: "sm", cls: "shadow", elev: "1 · cartes", use: "Cartes, panneaux" },
  { tok: "md", cls: "shadow-md", elev: "2 · surfaces sorties", use: "Popovers, menus" },
  { tok: "lg", cls: "shadow-lg", elev: "3 · flottant", use: "Dialogs, sheets" },
  { tok: "xl", cls: "shadow-xl", elev: "4 · au-dessus de tout", use: "Modales importantes, toasts" },
];

function Shadows() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Shadows</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Cinq niveaux, du posé au flottant. Subtile, jamais attention-grabbing : si l'ombre est la première
          chose qu'on voit, elle est trop forte.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {SHADOWS.map((s) => (
          <div key={s.tok} className="flex flex-col items-center gap-4">
            <div className={`h-24 w-full rounded-xl border border-border bg-card ${s.cls}`} />
            <div className="flex w-full flex-col">
              <code className="text-sm font-medium text-foreground">shadow-{s.tok}</code>
              <span className="text-xs text-muted-foreground">{s.elev}</span>
              <span className="text-xs text-muted-foreground">{s.use}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof Shadows> = {
  title: "Foundations/Shadows",
  component: Shadows,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Shadows> = {};
