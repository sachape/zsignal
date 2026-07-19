import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Typography — l'échelle réelle (tokens font.size xs→4xl, weights
 * 400/500/600/700) mappée en RÔLES lisibles. Chaque rôle : taille, graisse,
 * interligne, usage et exemple live. Police produit : Instrument Sans ; mono : JetBrains Mono.
 */

type Row = { role: string; cls: string; px: string; weight: string; lh: string; usage: string; sample?: string };
const ROWS: Row[] = [
  { role: "Display", cls: "text-4xl font-semibold leading-tight", px: "36px", weight: "600", lh: "1.1", usage: "Hero / landing" },
  { role: "H1", cls: "text-3xl font-semibold leading-tight", px: "30px", weight: "600", lh: "1.2", usage: "Titre de page" },
  { role: "H2", cls: "text-2xl font-semibold", px: "24px", weight: "600", lh: "1.3", usage: "Titre de section" },
  { role: "H3", cls: "text-xl font-semibold", px: "20px", weight: "600", lh: "1.4", usage: "Titre de carte" },
  { role: "H4", cls: "text-lg font-medium", px: "18px", weight: "500", lh: "1.4", usage: "Sous-titre" },
  { role: "Body L", cls: "text-base", px: "16px", weight: "400", lh: "1.5", usage: "Corps large / intro" },
  { role: "Body M", cls: "text-sm", px: "14px", weight: "400", lh: "1.5", usage: "Corps par défaut" },
  { role: "Body S", cls: "text-[0.8125rem]", px: "13px", weight: "400", lh: "1.5", usage: "Corps dense" },
  { role: "Caption", cls: "text-xs text-muted-foreground", px: "12px", weight: "400", lh: "1.4", usage: "Métadonnée / label" },
  { role: "Code", cls: "font-mono text-sm", px: "14px", weight: "400", lh: "1.5", usage: "Chiffres tabulaires, code", sample: "--space-8: 2rem;" },
];

function Typography() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Typography</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Hiérarchie = taille + graisse (jamais la taille seule). Échelle réelle : xs (12) → 4xl (36).
          Graisses : 400 / 500 / 600 / 700.
        </p>
      </header>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {ROWS.map((r) => (
          <div key={r.role} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-[220px_1fr] md:items-baseline">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-foreground">{r.role}</span>
              <span className="font-mono text-xs text-muted-foreground">{r.px} · w{r.weight} · lh {r.lh}</span>
              <span className="text-xs text-muted-foreground">{r.usage}</span>
            </div>
            <p className={`${r.cls} text-foreground`}>{r.sample ?? "Streamnco — analyser, préparer, publier."}</p>
          </div>
        ))}
      </div>
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
