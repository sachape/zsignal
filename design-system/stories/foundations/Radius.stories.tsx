import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Radius — échelle de rayons (tokens `--radius-*`). Sharper =
 * technique, rounder = amical. Cohérence : petits éléments < cartes < modales.
 */

const RADII = [
  { cls: "rounded-sm", label: "sm", role: "Inputs, badges, boutons compacts" },
  { cls: "rounded-md", label: "md", role: "Boutons, cartes standard" },
  { cls: "rounded-lg", label: "lg", role: "Cartes, popovers" },
  { cls: "rounded-xl", label: "xl", role: "Modales, grandes surfaces" },
  { cls: "rounded-full", label: "full", role: "Avatars, pills" },
];

function Radius() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Radius</h1>
        <p className="text-sm text-muted-foreground">
          Rayons sémantiques dérivés des tokens. Ne pas mélanger sharp et soft au hasard sur un même écran.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
        {RADII.map((r) => (
          <div key={r.label} className="flex flex-col items-center gap-4">
            <div className={`h-24 w-24 border border-border bg-card ${r.cls}`} />
            <div className="flex flex-col items-center">
              <code className="text-sm font-medium text-foreground">{r.label}</code>
              <span className="text-center text-xs text-muted-foreground">{r.role}</span>
            </div>
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
