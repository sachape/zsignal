import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Colors — documentée en TROIS couches (Primitive → Semantic →
 * Component), à l'image de l'architecture de tokens. Rendu depuis les VRAIES
 * variables CSS générées : aucune valeur inventée. Les familles éparses sont
 * montrées telles quelles (l'enrichissement en rampes complètes = chantier Tokens V2).
 */

function Sw({ v, name, sub }: { v: string; name: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="h-12 w-full rounded-md border border-border" style={{ background: `hsl(var(${v}))` }} />
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[11px] text-foreground">{name}</span>
        {sub && <span className="font-mono text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}
function Ramp({ title, note, family, steps }: { title: string; note?: string; family: string; steps: (string | number)[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-9">
        {steps.map((s) => <Sw key={s} v={`--color-${family}-${s}`} name={`${s}`} />)}
      </div>
    </div>
  );
}
function Section({ n, title, desc, children }: { n: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <span className="text-xs font-medium uppercase tracking-wide text-primary">{n}</span>
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{desc}</p>
      </div>
      {children}
    </section>
  );
}

const NEUTRAL = [0, 50, 100, 150, 200, 300, 400, 500, 600, 700, 750, 775, 800, 850, 900, 925, 950];
const ACCENTS = ["teal", "green", "amber", "blue", "orange", "yellow", "purple", "pink"];
const PLATFORMS = ["twitch", "youtube", "instagram", "tiktok", "x", "google"];

const SEMANTIC: { group: string; items: { name: string; v: string; alias: string }[] }[] = [
  { group: "Background", items: [
    { name: "page", v: "--color-background-page", alias: "neutral.950" },
    { name: "surface", v: "--color-background-surface", alias: "neutral.900" },
    { name: "elevated", v: "--color-background-elevated", alias: "neutral.850" },
    { name: "muted", v: "--color-background-muted", alias: "neutral.800" },
    { name: "brand", v: "--color-background-brand", alias: "lime.500" },
    { name: "danger", v: "--color-background-danger", alias: "red.500" },
  ]},
  { group: "Text", items: [
    { name: "primary", v: "--color-text-primary", alias: "neutral.150" },
    { name: "secondary", v: "--color-text-secondary", alias: "neutral.400" },
    { name: "tertiary", v: "--color-text-tertiary", alias: "neutral.500" },
    { name: "brand", v: "--color-text-brand", alias: "lime.500" },
    { name: "danger", v: "--color-text-danger", alias: "red.400" },
  ]},
  { group: "Border", items: [
    { name: "default", v: "--color-border-default", alias: "neutral.750" },
    { name: "strong", v: "--color-border-strong", alias: "neutral.700" },
    { name: "focus", v: "--color-border-focus", alias: "lime.500" },
    { name: "danger", v: "--color-border-danger", alias: "red.500" },
  ]},
  { group: "Action", items: [
    { name: "primary", v: "--color-action-primary-default", alias: "lime.500" },
    { name: "primary·hover", v: "--color-action-primary-hover", alias: "lime.400" },
    { name: "primary·pressed", v: "--color-action-primary-pressed", alias: "lime.600" },
    { name: "destructive", v: "--color-action-destructive-default", alias: "red.500" },
  ]},
];

function Colors() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Colors</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Trois couches : <strong>Primitive</strong> (valeurs brutes) → <strong>Semantic</strong> (intentions) →
          <strong> Component</strong> (usages). Marque = lime, danger = red, neutre = neutral.
        </p>
      </header>

      <Section n="1 · Primitive" title="Primitive Colors" desc="Les palettes brutes. neutral est une rampe complète ; les familles de marque/accent sont volontairement éparses (steps réellement utilisés). Rampes complètes 50→950 = chantier Tokens V2.">
        <div className="flex flex-col gap-8">
          <Ramp title="Neutral" note="rampe complète (17)" family="neutral" steps={NEUTRAL} />
          <Ramp title="Lime" note="marque · partielle" family="lime" steps={[400, 500, 600]} />
          <Ramp title="Red" note="danger · partielle" family="red" steps={[400, 500, 600]} />
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">Accents <span className="font-normal text-muted-foreground">· valeur unique (500)</span></h3>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {ACCENTS.map((a) => <Sw key={a} v={`--color-${a}-500`} name={a} />)}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">Platform <span className="font-normal text-muted-foreground">· couleurs de marque des réseaux</span></h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {PLATFORMS.map((p) => <Sw key={p} v={`--color-platform-${p}`} name={p} />)}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">Data Visualization</h3>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((d) => <Sw key={d} v={`--color-data-${d}`} name={`data.${d}`} />)}
            </div>
          </div>
        </div>
      </Section>

      <Section n="2 · Semantic" title="Semantic Colors" desc="Ce que veut DIRE une couleur dans le produit. Chaque token sémantique aliase une primitive (indiquée). Un composant consomme cette couche, jamais une primitive en dur.">
        <div className="flex flex-col gap-8">
          {SEMANTIC.map((g) => (
            <div key={g.group} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground">{g.group}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {g.items.map((it) => <Sw key={it.name} v={it.v} name={it.name} sub={`→ ${it.alias}`} />)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section n="3 · Component" title="Component Usage" desc="Comment les couches précédentes se traduisent dans les composants — via des tokens component (button.*, badge.*…), jamais de couleur brute.">
        <div className="flex flex-wrap items-center gap-4">
          <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Button · primary</button>
          <button className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground">Button · destructive</button>
          <span className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground">Button · secondary</span>
          <span className="rounded-md border border-transparent bg-success px-3 py-1 text-xs text-success-foreground">Badge · success</span>
          <span className="rounded-md border border-destructive/40 bg-transparent px-3 py-1 text-xs text-destructive-strong">Alert · destructive</span>
        </div>
        <p className="text-xs text-muted-foreground">Détail des tokens par composant : Foundations/Tokens (couche Component).</p>
      </Section>
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
