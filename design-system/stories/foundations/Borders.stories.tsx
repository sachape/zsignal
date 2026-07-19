import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Foundations / Borders — les bordures « chuchotent ». Progression d'intensité :
 * séparation douce → standard → emphase → focus ring.
 */

const BORDERS = [
  { cls: "border border-border/50", label: "border/50", role: "Séparation douce" },
  { cls: "border border-border", label: "border", role: "Standard (cartes, inputs)" },
  { cls: "border border-primary/40", label: "primary/40", role: "Emphase / sélection" },
  { cls: "border-2 border-ring", label: "ring", role: "Focus (clavier)" },
];

function Borders() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Borders</h1>
        <p className="text-sm text-muted-foreground">
          Une bordure disparaît quand on ne la cherche pas, mais reste trouvable pour structurer.
          rgba faible plutôt que hex plein (moins dur).
        </p>
      </header>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {BORDERS.map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-4">
            <div className={`h-20 w-full rounded-lg bg-card ${b.cls}`} />
            <div className="flex flex-col items-center">
              <code className="text-xs font-medium text-foreground">{b.label}</code>
              <span className="text-center text-xs text-muted-foreground">{b.role}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Rayons : voir Foundations/Radius.</p>
    </div>
  );
}

const meta: Meta<typeof Borders> = {
  title: "Foundations/Borders",
  component: Borders,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Borders> = {};
