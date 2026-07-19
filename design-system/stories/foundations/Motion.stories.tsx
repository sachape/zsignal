import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

/**
 * Foundations / Motion — durées réelles (tokens --duration-*) + courbes (easings
 * sémantiques) + démo. Micro-interactions rapides, décélération, pas de spring/bounce.
 */

const DURATIONS = [
  { tok: "instant", ms: "0ms", use: "Changements sans transition" },
  { tok: "fast", ms: "120ms", use: "Hover, focus, petites bascules" },
  { tok: "normal", ms: "200ms", use: "Transitions d'état, dropdowns" },
  { tok: "slow", ms: "320ms", use: "Overlays, dialogs, grands déplacements" },
];
const EASINGS = [
  { name: "decelerate (enter)", cls: "ease-out", use: "Entrées : rapide puis ralentit" },
  { name: "accelerate (exit)", cls: "ease-in", use: "Sorties : part doucement puis accélère" },
  { name: "standard", cls: "ease-in-out", use: "Mouvements symétriques" },
  { name: "linear", cls: "linear", use: "Progress, spinners" },
];

function Motion() {
  const [on, setOn] = useState(false);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Motion</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Le mouvement guide l'attention, il ne décore pas. Durées réelles ; easing en décélération par défaut.
          Respecter <code>prefers-reduced-motion</code>.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Durées</h2>
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {DURATIONS.map((d) => (
            <div key={d.tok} className="grid grid-cols-[80px_64px_1fr] items-center gap-4 p-4 text-sm">
              <code className="font-medium text-foreground">{d.tok}</code>
              <code className="font-mono text-xs text-muted-foreground">{d.ms}</code>
              <span className="text-muted-foreground">{d.use}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Courbes (easing)</h2>
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {EASINGS.map((e) => (
            <div key={e.name} className="grid grid-cols-[200px_1fr] items-center gap-4 p-4 text-sm">
              <code className="font-medium text-foreground">{e.name}</code>
              <span className="text-muted-foreground">{e.use}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Démo (normal · 200ms · ease-out)</h2>
        <button onClick={() => setOn((v) => !v)} className="w-40 rounded-md border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground">Basculer</button>
        <div className="h-8 w-full rounded bg-muted">
          <div className="h-8 rounded bg-primary transition-all duration-200 ease-out" style={{ width: on ? "100%" : "16px" }} />
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
