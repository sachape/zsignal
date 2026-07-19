import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Opacity — échelle d'opacité pour états et tints. ATTENTION :
 * l'opacité sur du texte casse le contraste (cf. l'audit a11y) — préférer un token
 * de couleur dédié pour le texte, l'opacité pour les surfaces/états.
 */

const STEPS = [
  { o: 100, role: "Actif / normal" },
  { o: 60, role: "Tint de surface (bg-primary/60)" },
  { o: 50, role: "Disabled (éléments non-texte)" },
  { o: 15, role: "Fond teinté doux (bg-primary/15)" },
];

function Opacity() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Opacity</h1>
        <p className="text-sm text-muted-foreground">
          Pour les surfaces, tints et états. <strong>Pas sur du texte</strong> : un texte à opacité réduite
          échoue souvent le contraste AA (voir Foundations/Accessibility).
        </p>
      </header>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.o} className="flex flex-col items-center gap-3">
            <div className="h-20 w-full rounded-lg border border-border bg-primary" style={{ opacity: s.o / 100 }} />
            <div className="flex flex-col items-center">
              <code className="text-sm font-medium text-foreground">{s.o}%</code>
              <span className="text-center text-xs text-muted-foreground">{s.role}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof Opacity> = {
  title: "Foundations/Opacity",
  component: Opacity,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Opacity> = {};
