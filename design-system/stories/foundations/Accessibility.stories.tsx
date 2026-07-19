import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Accessibility — page de référence. L'a11y n'est pas une checklist
 * finale : elle est BLOQUANTE en CI (axe en mode error). Statut réel : voir Health.
 */

function Rule({ t, d, ok = true }: { t: string; d: string; ok?: boolean }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6">
      <span aria-hidden className={`mt-2 text-sm ${ok ? "text-success" : "text-warning"}`}>{ok ? "●" : "▲"}</span>
      <div className="flex flex-col gap-2">
        <p className="text-base font-semibold text-foreground">{t}</p>
        <p className="text-sm text-muted-foreground">{d}</p>
      </div>
    </div>
  );
}

function Accessibility() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Accessibility</h1>
        <p className="text-sm text-muted-foreground">
          Vérifiée à chaque commit. Une violation axe fait échouer la CI. Statut courant et détail dans <strong>Health</strong>.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Rule t="Contraste AA" d="Texte ≥ 4.5:1 (≥ 3:1 pour le grand texte). Ne pas réduire le contraste via opacity sur du texte." />
        <Rule t="Nom accessible" d="Toute icône seule / contrôle a un aria-label ou un texte sr-only." />
        <Rule t="Navigation clavier" d="Tout est atteignable et actionnable au clavier ; ordre de tabulation logique." />
        <Rule t="Focus visible" d="Anneau de focus net (focus-visible:ring) sur chaque élément interactif." />
        <Rule t="Cibles tactiles" d="≥ 44px pour les actions, sur toutes les largeurs." />
        <Rule t="Couleur ≠ seul signal" d="Un statut est porté par un libellé + une forme, pas uniquement la couleur." />
      </div>
      <p className="text-xs text-muted-foreground">
        Faux positifs de librairie (Radix) et cas inconclusifs (dégradés) sont documentés, pas masqués.
      </p>
    </div>
  );
}

const meta: Meta<typeof Accessibility> = {
  title: "Foundations/Accessibility",
  component: Accessibility,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Accessibility> = {};
