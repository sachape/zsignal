import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Shadows — ombres discrètes. En dark, l'ombre porte peu : on
 * s'appuie surtout sur la bordure + le shift de surface. Jamais d'ombre dramatique.
 */

const SHADOWS = [
  { cls: "shadow-sm", label: "sm", role: "Boutons, éléments posés" },
  { cls: "shadow-md", label: "md", role: "Cartes, popovers" },
  { cls: "shadow-lg", label: "lg", role: "Modales, éléments flottants" },
];

function Shadows() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Shadows</h1>
        <p className="text-sm text-muted-foreground">
          L'ombre suggère l'élévation. Subtile, jamais attention-grabbing — si l'ombre est la première
          chose qu'on voit, elle est trop forte.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {SHADOWS.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-4">
            <div className={`h-24 w-full rounded-xl border border-border bg-card ${s.cls}`} />
            <div className="flex flex-col items-center">
              <code className="text-sm font-medium text-foreground">{s.label}</code>
              <span className="text-center text-xs text-muted-foreground">{s.role}</span>
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
