import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Colors — rendu des tokens de couleur SÉMANTIQUES réellement
 * consommés par les composants (via Tailwind `hsl(var(--token))`). L'explorateur
 * complet (primitive → semantic → component) vit dans Foundations/Tokens.
 */

function Swatch({ label, cls, note }: { label: string; cls: string; note?: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`h-12 w-12 shrink-0 rounded-lg border border-border ${cls}`} />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
    </div>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{children}</div>
    </section>
  );
}

function Colors() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Colors</h1>
        <p className="text-sm text-muted-foreground">
          Marque = <strong>lime</strong> (<code>--primary</code>). Le <strong>teal</strong> (<code>--accent</code>)
          est un tint secondaire, jamais une action. Accessibilité bloquante (contraste AA).
        </p>
      </header>

      <Group title="Marque & actions">
        <Swatch label="primary (lime)" cls="bg-primary" note="action principale" />
        <Swatch label="accent (teal)" cls="bg-accent" note="tint secondaire" />
        <Swatch label="destructive" cls="bg-destructive" note="danger, texte blanc" />
        <Swatch label="success" cls="bg-success" />
        <Swatch label="warning" cls="bg-warning" />
        <Swatch label="secondary" cls="bg-secondary" />
      </Group>

      <Group title="Surfaces (élévation)">
        <Swatch label="background" cls="bg-background" note="canvas" />
        <Swatch label="card" cls="bg-card" />
        <Swatch label="popover" cls="bg-popover" note="menus, overlays" />
        <Swatch label="muted" cls="bg-muted" />
        <Swatch label="border" cls="bg-border" />
        <Swatch label="input" cls="bg-input" />
      </Group>

      <Group title="Texte (hiérarchie)">
        <Swatch label="foreground" cls="bg-foreground" note="texte principal" />
        <Swatch label="muted-foreground" cls="bg-muted-foreground" note="secondaire" />
        <Swatch label="primary-foreground" cls="bg-primary-foreground" note="sur lime" />
        <Swatch label="destructive-strong" cls="bg-[hsl(var(--color-text-danger))]" note="texte danger (dark/light)" />
      </Group>

      <p className="text-xs text-muted-foreground">
        Un composant consomme un token <strong>sémantique</strong>, jamais une primitive en dur (garde-fou <code>lint:tokens</code>).
        Dark par défaut ; <code>.light</code> en override.
      </p>
    </div>
  );
}

const meta: Meta<typeof Colors> = {
  title: "Foundations/Colors",
  component: Colors,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Colors> = {};
