import type { Meta, StoryObj } from "@storybook/react-vite";
import { Play, Search, Bell, Settings, Check, X, ChevronRight, Upload } from "lucide-react";

/**
 * Foundations / Icons — jeu d'icônes unique : lucide-react. Les icônes clarifient,
 * elles ne décorent pas (si retirer l'icône ne perd aucun sens, la retirer).
 */

const SIZES = [
  { cls: "h-4 w-4", label: "16px", role: "Inline, boutons compacts" },
  { cls: "h-5 w-5", label: "20px", role: "Boutons, navigation" },
  { cls: "h-6 w-6", label: "24px", role: "En-têtes, états vides" },
];

function Icons() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Icons</h1>
        <p className="text-sm text-muted-foreground">
          Bibliothèque : <strong>lucide-react</strong> (unique). Une icône seule doit porter un nom accessible
          (<code>aria-label</code> ou texte <code>sr-only</code>).
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Tailles</h2>
        <div className="flex flex-col gap-4">
          {SIZES.map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <Play className={`${s.cls} text-foreground`} aria-hidden />
              <code className="w-16 text-xs text-muted-foreground">{s.label}</code>
              <span className="text-sm text-muted-foreground">{s.role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Échantillon</h2>
        <div className="flex flex-wrap gap-6 text-foreground">
          {[Search, Bell, Settings, Check, X, ChevronRight, Upload].map((I, idx) => (
            <I key={idx} className="h-6 w-6" aria-hidden />
          ))}
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof Icons> = {
  title: "Foundations/Icons",
  component: Icons,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Icons> = {};
