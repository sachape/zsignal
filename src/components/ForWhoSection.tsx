import { useRef, useState, useEffect, type CSSProperties } from "react";
import { TrendingUp, BarChart3, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CSS = `
  @keyframes pw-fade-up {
    from { opacity:0; transform:translateY(22px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes pw-pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
`;

function useVisible(threshold = 0.2) {
  const ref = useRef<HTMLElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible: v };
}

function anim(vis: boolean, delay = 0): CSSProperties {
  return vis
    ? { animation: `pw-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }
    : { opacity: 0 };
}

interface Persona {
  icon: LucideIcon;
  label: string;
  tag?: string;
  description: string;
  featured?: boolean;
}

const PERSONAS: Persona[] = [
  {
    icon: TrendingUp,
    label: "Débutant sérieux",
    description:
      "Tu streames depuis peu mais tu veux poser les bonnes bases dès le début, éviter les erreurs classiques et progresser plus vite.",
  },
  {
    icon: BarChart3,
    label: "Streamer qui stagne",
    tag: "Le plus fréquent",
    description:
      "Tu publies régulièrement mais ta croissance est à l'arrêt. Tu veux comprendre ce qui bloque et identifier les leviers concrets.",
    featured: true,
  },
  {
    icon: Target,
    label: "Créateur structuré",
    description:
      "Tu veux suivre ta progression dans le temps, valider tes décisions par des données et construire une stratégie de contenu cohérente.",
  },
];

function PersonaCard({
  persona,
  visible,
  delay,
}: {
  persona: Persona;
  visible: boolean;
  delay: number;
}) {
  const { icon: Icon, label, tag, description, featured } = persona;
  return (
    <div className="h-full" style={anim(visible, delay)}>
      {/* Gradient-border wrapper — 1 px of padding, BG is the border */}
      <div
        className={[
          "relative h-full rounded-xl p-px",
          featured
            ? "bg-gradient-to-b from-primary/45 via-primary/10 to-transparent shadow-[0_0_50px_hsl(var(--primary)/0.13)]"
            : "bg-gradient-to-b from-border/70 to-border/20",
        ].join(" ")}
      >
        {/* Top-edge highlight (featured only) */}
        {featured && (
          <div className="absolute inset-x-4 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
        )}

        {/* Inner card — no cursor:pointer, no hover effects */}
        <div className="relative flex h-full flex-col overflow-hidden rounded-[11px] bg-card px-6 py-7">
          {/* Ambient top glow (featured only) */}
          {featured && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,hsl(var(--primary)/0.07),transparent)]"
            />
          )}

          {/* Badge */}
          {tag && (
            <span className="mb-4 inline-flex w-fit items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              {tag}
            </span>
          )}

          {/* Icon */}
          <div className="relative mb-5 w-fit">
            {featured && (
              <div
                aria-hidden
                className="absolute inset-0 scale-[2.2] rounded-lg bg-primary/25 blur-xl opacity-60"
              />
            )}
            <div
              className={[
                "relative flex h-12 w-12 items-center justify-center rounded-xl ring-1",
                featured
                  ? "bg-primary/15 ring-primary/35 shadow-[0_0_16px_hsl(var(--primary)/0.25)]"
                  : "bg-primary/10 ring-primary/20",
              ].join(" ")}
            >
              <Icon className="h-[22px] w-[22px] text-primary" />
            </div>
          </div>

          <h3 className="mb-2.5 text-xl font-semibold tracking-tight text-foreground">
            {label}
          </h3>
          <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ForWhoSection() {
  const { ref, visible } = useVisible();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <section
        ref={ref}
        className="relative overflow-hidden border-t border-border/50 py-28"
      >
        <div className="absolute inset-0 bg-dot-grid opacity-[0.15]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_50%_110%,hsl(var(--primary)/0.08),transparent)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-accent/5 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]"
        />

        <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
          {/* Header */}
          <div className="mb-14 text-center" style={anim(visible, 0)}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                style={{ animation: "pw-pulse 2s ease-in-out infinite" }}
              />
              Pour qui
            </span>

            <h2 className="mx-auto mt-4 max-w-lg text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Tu te reconnais ?
            </h2>

            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Que tu démarres ou que tu stagnes, Stream Spark t'apporte les
              données qui manquaient pour progresser.
            </p>
          </div>

          {/* Cards — read-only, no CTA, no hover implying interactivity */}
          <div className="grid gap-4 sm:grid-cols-3">
            {PERSONAS.map((persona, i) => (
              <PersonaCard
                key={persona.label}
                persona={persona}
                visible={visible}
                delay={120 + i * 120}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
