import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Breakpoints — UNIQUEMENT les seuils responsive et la stratégie
 * mobile-first. Les colonnes vivent dans Foundations/Grid, les compositions dans
 * Foundations/Layout.
 */

const BP = [
  { k: "sm", px: "640px", use: "Petites tablettes / gros mobiles paysage" },
  { k: "md", px: "768px", use: "Tablettes — 2 colonnes apparaissent" },
  { k: "lg", px: "1024px", use: "Desktop — sidebar + contenu" },
  { k: "xl", px: "1280px", use: "Conteneur plafonné (max-w-7xl)" },
  { k: "2xl", px: "1536px", use: "Grands écrans — marges généreuses" },
];

function Breakpoints() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Breakpoints</h1>
        <p className="text-sm text-muted-foreground">
          <strong>Mobile-first</strong> : on conçoit l'empilement d'abord, puis on ajoute les colonnes
          aux seuils. Seuils Tailwind standards.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-border">
        {BP.map((b, i) => (
          <div key={b.k} className={`flex items-center gap-6 bg-card px-4 py-4 ${i ? "border-t border-border" : ""}`}>
            <code className="w-12 shrink-0 font-mono text-sm text-primary-strong">{b.k}</code>
            <code className="w-24 shrink-0 font-mono text-xs text-muted-foreground">≥ {b.px}</code>
            <span className="text-sm text-foreground">{b.use}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Stratégie</h2>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li>· Base = mobile (sans préfixe). Les préfixes <code>sm:</code>, <code>md:</code>, <code>lg:</code>… ajoutent, ne retirent pas.</li>
          <li>· Un seul breakpoint majeur par changement de layout — éviter la sur-adaptation.</li>
          <li>· Les cibles tactiles restent ≥ 44px quelle que soit la largeur.</li>
        </ul>
      </section>
    </div>
  );
}

const meta: Meta<typeof Breakpoints> = {
  title: "Foundations/Breakpoints",
  component: Breakpoints,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Breakpoints> = {};
