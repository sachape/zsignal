import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Dark Mode — le thème. Dark est le DÉFAUT ; .light est un override.
 * Les tokens sont theme-aware : un composant ne connaît que les tokens sémantiques.
 */

function Preview({ theme }: { theme: "dark" | "light" }) {
  return (
    <div className={`${theme} flex flex-col gap-4 rounded-xl border border-border bg-card p-6`}>
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{theme}</span>
      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Primary</button>
        <span className="rounded-md border border-border bg-card px-4 py-2 text-sm text-foreground">Card</span>
        <span className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground">Danger</span>
      </div>
      <p className="text-sm text-muted-foreground">Texte secondaire · muted-foreground</p>
    </div>
  );
}

function DarkMode() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Dark Mode</h1>
        <p className="text-sm text-muted-foreground">
          <strong>Dark par défaut</strong>, <code>.light</code> en override (toggle dans la barre d'outils Storybook).
          Certains tokens (ex. le rouge de texte danger) sont ajustés par thème pour préserver le contraste.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Preview theme="dark" />
        <Preview theme="light" />
      </div>

      <section className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>· Source : <code>src/tokens.generated.css</code> (:root, dark) + <code>src/tokens.light.generated.css</code> (.light).</p>
        <p>· Un composant consomme <code>bg-card</code>, <code>text-foreground</code>… jamais une couleur en dur → il bascule tout seul.</p>
      </section>
    </div>
  );
}

const meta: Meta<typeof DarkMode> = {
  title: "Foundations/Dark Mode",
  component: DarkMode,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof DarkMode> = {};
