import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Radius — l'échelle réelle des rayons (tokens --radius-*) + les
 * alias sémantiques (control, card, container) et les composants concernés.
 * Valeurs réelles, aucune inventée.
 */

const SCALE = [
  { tok: "none", px: "0", cls: "rounded-none", use: "Séparateurs, aplats pleine largeur" },
  { tok: "xs", px: "4px", cls: "rounded", use: "Petits éléments, tags" },
  { tok: "sm", px: "6px", cls: "rounded-sm", use: "Inputs, boutons compacts" },
  { tok: "md", px: "8px", cls: "rounded-md", use: "Boutons, contrôles → alias control" },
  { tok: "lg", px: "10px", cls: "rounded-lg", use: "Cartes, popovers → alias card / container" },
  { tok: "xl", px: "14px", cls: "rounded-xl", use: "Grandes surfaces" },
  { tok: "2xl", px: "16px", cls: "rounded-2xl", use: "Modales, héros" },
  { tok: "full", px: "9999px", cls: "rounded-full", use: "Avatars, pills, switches" },
];

function Radius() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Radius</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Échelle réelle <code>--radius-none → --radius-full</code>. Sémantique : <code>control</code> = md,
          <code>card</code>/<code>container</code> = lg. Ne pas mélanger sharp et soft au hasard.
        </p>
      </header>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {SCALE.map((r) => (
          <div key={r.tok} className="grid grid-cols-[64px_1fr] items-center gap-6 p-6 md:grid-cols-[64px_120px_1fr]">
            <div className={`h-16 w-16 border border-primary/40 bg-primary/15 ${r.cls}`} />
            <div className="flex flex-col">
              <code className="text-sm font-medium text-foreground">{r.tok}</code>
              <span className="font-mono text-xs text-muted-foreground">{r.px}</span>
            </div>
            <span className="text-sm text-muted-foreground">{r.use}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof Radius> = {
  title: "Foundations/Radius",
  component: Radius,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Radius> = {};
