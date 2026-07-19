import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

/**
 * Foundations / Motion — durées & courbes. Micro-interactions rapides, easing en
 * décélération, pas de spring/bounce dans une interface pro. Respecter prefers-reduced-motion.
 */

const DURATIONS = [
  { ms: 100, role: "Feedback immédiat (hover, focus)" },
  { ms: 200, role: "Transitions d'état standard" },
  { ms: 300, role: "Ouverture d'overlays" },
  { ms: 500, role: "Grands déplacements / progress" },
];

function Motion() {
  const [on, setOn] = useState(false);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Motion</h1>
        <p className="text-sm text-muted-foreground">
          Le mouvement guide l'attention, il ne décore pas. Easing en décélération (ease-out) par défaut.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Durées</h2>
        <div className="flex flex-col gap-2 text-sm">
          {DURATIONS.map((d) => (
            <div key={d.ms} className="flex items-center gap-4">
              <code className="w-16 shrink-0 text-xs text-muted-foreground">{d.ms}ms</code>
              <span className="text-muted-foreground">{d.role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Démo (ease-out, 300ms)</h2>
        <button
          onClick={() => setOn((v) => !v)}
          className="w-40 rounded-md border border-border bg-secondary px-4 py-2 text-sm"
        >
          Basculer
        </button>
        <div className="h-8 w-full rounded bg-muted">
          <div
            className="h-8 rounded bg-primary transition-all duration-300 ease-out"
            style={{ width: on ? "100%" : "16px" }}
          />
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof Motion> = {
  title: "Foundations/Motion",
  component: Motion,
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Motion> = {};
