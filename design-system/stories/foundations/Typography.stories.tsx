import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Typography — échelle typographique réelle (classes Tailwind
 * effectivement utilisées) + rôles. Police d'app : système ; mono : JetBrains Mono.
 */

const SCALE = [
  { cls: "text-4xl font-semibold", label: "text-4xl", role: "Display / héros" },
  { cls: "text-2xl font-semibold", label: "text-2xl", role: "Titre de page (h1)" },
  { cls: "text-lg font-medium", label: "text-lg", role: "Titre de section (h2)" },
  { cls: "text-base font-semibold", label: "text-base", role: "Titre de carte (h3)" },
  { cls: "text-sm", label: "text-sm", role: "Corps par défaut" },
  { cls: "text-xs text-muted-foreground", label: "text-xs", role: "Métadonnée / label" },
];

function Typography() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Typography</h1>
        <p className="text-sm text-muted-foreground">
          Hiérarchie combinant taille + graisse (pas la taille seule). Quatre niveaux de texte :
          foreground, muted-foreground, et les variantes de graisse.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        {SCALE.map((s) => (
          <div key={s.label} className="flex flex-col gap-2 border-b border-border pb-6">
            <div className="flex items-baseline gap-4">
              <code className="w-24 shrink-0 text-xs text-muted-foreground">{s.label}</code>
              <span className="text-xs text-muted-foreground">{s.role}</span>
            </div>
            <p className={s.cls}>Streamnco — analyser, préparer, recycler, publier, mesurer.</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Chiffres tabulaires & mono</h2>
        <div className="flex flex-col gap-2">
          <span className="text-sm tabular-nums">Score tabulaire : 84.3 % · 1 118 · 12 px</span>
          <span className="font-mono text-sm">--space-8: 2rem; /* JetBrains Mono */</span>
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof Typography> = {
  title: "Foundations/Typography",
  component: Typography,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Typography> = {};
