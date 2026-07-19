import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Grid — UNIQUEMENT la grille : colonnes, gouttières, container,
 * max-width, CSS Grid. Le spacing vit dans Foundations/Spacing, les seuils dans
 * Foundations/Breakpoints, les compositions dans Foundations/Layout.
 */

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-12 place-items-center rounded border border-primary/40 bg-primary/15 font-mono text-xs text-primary-strong">
      {children}
    </div>
  );
}

function Grid() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Grid</h1>
        <p className="text-sm text-muted-foreground">
          Grille de référence <strong>12 colonnes</strong>, gouttière <code>gap-4</code> (16px).
          Base CSS Grid (Tailwind), pas de composant <code>&lt;Grid&gt;</code> maison.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">12 colonnes</h2>
        <div className="grid grid-cols-12 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <Cell key={i}>{i + 1}</Cell>)}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Container & max-width</h2>
        <p className="text-sm text-muted-foreground">Le contenu est centré et plafonné (<code>max-w-7xl</code> ≈ 1280px) pour rester lisible sur grand écran.</p>
        <div className="rounded-lg border border-dashed border-border p-4">
          <div className="mx-auto grid h-16 max-w-md place-items-center rounded bg-muted text-xs text-muted-foreground">contenu centré · max-width</div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Spans (colonnes fusionnées)</h2>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8"><Cell>col-span-8</Cell></div>
          <div className="col-span-4"><Cell>col-span-4</Cell></div>
          <div className="col-span-6"><Cell>col-span-6</Cell></div>
          <div className="col-span-6"><Cell>col-span-6</Cell></div>
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof Grid> = {
  title: "Foundations/Grid",
  component: Grid,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Grid> = {};
