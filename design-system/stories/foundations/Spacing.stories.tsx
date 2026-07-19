import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Spacing — l'échelle 8/4 officielle (ADR 0001). Deux niveaux :
 * PREFERRED (rythme principal) et COMPACT-ALLOWED (secondaire). La conformité
 * réelle du code est mesurée dans Health (audit automatique).
 */

const PREFERRED = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 120, 128];
const COMPACT = [4, 12, 20];

function Row({ px, tone }: { px: number; tone: "preferred" | "compact" }) {
  return (
    <div className="flex items-center gap-4">
      <code className="w-16 shrink-0 text-right text-xs text-muted-foreground">{px}px</code>
      <div
        className={`h-4 rounded ${tone === "preferred" ? "bg-primary" : "bg-warning"}`}
        style={{ width: `${Math.max(px, 2)}px` }}
      />
    </div>
  );
}

function Spacing() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Spacing</h1>
        <p className="text-sm text-muted-foreground">
          Base <strong>8px</strong>, sous-grille <strong>4px</strong>. Périmètre : margin, padding, gap, inset —
          pas les tailles (width/height/radius). Détail : <code>docs/adr/0001-spacing-8-4-grid.md</code>.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-foreground">Preferred — rythme principal (défaut)</h2>
        <div className="flex flex-col gap-2">
          {PREFERRED.map((n) => <Row key={n} px={n} tone="preferred" />)}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-foreground">Compact-allowed — sous-grille secondaire</h2>
        <p className="text-sm text-muted-foreground">Pour les composants denses. Conforme, mais à préférer seulement si la densité le justifie.</p>
        <div className="flex flex-col gap-2">
          {COMPACT.map((n) => <Row key={n} px={n} tone="compact" />)}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-foreground">Hors échelle = violation</h2>
        <p className="text-sm text-muted-foreground">
          <code>2, 6, 10, 14, 28, 36, 44…</code> (dont les pas Tailwind <code>.5</code>). Les négatifs de positionnement
          intentionnels sont des exceptions documentées. La conformité réelle est suivie dans <strong>Health</strong>.
        </p>
      </section>
    </div>
  );
}

const meta: Meta<typeof Spacing> = {
  title: "Foundations/Spacing",
  component: Spacing,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Spacing> = {};
