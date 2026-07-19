import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Layout — UNIQUEMENT les compositions de mise en page réutilisables
 * (Stack, Inline, Split, Sidebar, Auto-fit). Grille pure : Foundations/Grid.
 */

function Box({ children, h = "h-12" }: { children: React.ReactNode; h?: string }) {
  return <div className={`grid ${h} place-items-center rounded border border-border bg-muted text-xs text-muted-foreground`}>{children}</div>;
}
function Demo({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="rounded-lg border border-dashed border-border p-4">{children}</div>
    </section>
  );
}

function Layout() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Layout</h1>
        <p className="text-sm text-muted-foreground">Les compositions qu'on réutilise partout, en spacing preferred.</p>
      </header>

      <Demo title="Stack (vertical)" desc="Empilement avec gap régulier — la brique de base.">
        <div className="flex flex-col gap-4"><Box>bloc</Box><Box>bloc</Box><Box>bloc</Box></div>
      </Demo>

      <Demo title="Inline (horizontal)" desc="Éléments alignés avec gap, retour à la ligne si besoin.">
        <div className="flex flex-wrap gap-4"><Box>a</Box><Box>b</Box><Box>c</Box></div>
      </Demo>

      <Demo title="Split (contenu + aside)" desc="Deux tiers / un tiers — contenu principal + panneau latéral.">
        <div className="grid grid-cols-3 gap-4"><div className="col-span-2"><Box>contenu · 2/3</Box></div><Box>aside · 1/3</Box></div>
      </Demo>

      <Demo title="Sidebar (app)" desc="Navigation fixe + zone de contenu extensible.">
        <div className="grid grid-cols-[200px_1fr] gap-4"><Box h="h-24">sidebar</Box><Box h="h-24">contenu</Box></div>
      </Demo>

      <Demo title="Auto-fit (cartes)" desc="Grille qui remplit l'espace ; les cartes se réarrangent seules.">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {["Carte", "Carte", "Carte", "Carte"].map((t, i) => <Box key={i}>{t}</Box>)}
        </div>
      </Demo>
    </div>
  );
}

const meta: Meta<typeof Layout> = {
  title: "Foundations/Layout",
  component: Layout,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Layout> = {};
