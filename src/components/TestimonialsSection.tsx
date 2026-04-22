import { useRef, useState, useEffect, type CSSProperties } from "react";

const CSS = `
  @keyframes ts-in {
    from { opacity:0; transform:translateY(22px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes ts-pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
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
    ? { animation: `ts-in 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }
    : { opacity: 0 };
}

const STATS = [
  { val: "500+", label: "streamers analysés" },
  { val: "4.8/5", label: "note moyenne" },
  { val: "60s", label: "résultat garanti" },
];

interface Testimonial {
  name: string;
  handle: string;
  avatar: string;
  body: string;
  viewers: string;
  growth: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Mathieu_Live",
    handle: "@mathieu_live",
    avatar: "M",
    body: "J'étais à 8 viewers en moyenne depuis 6 mois. Après 3 semaines à suivre le plan hebdo, je suis passé à 21. Le score m'a montré que je streamais aux mauvais horaires — simple mais efficace.",
    viewers: "8 → 21",
    growth: "+163%",
  },
  {
    name: "Lucie Plays",
    handle: "@lucieplaysfr",
    avatar: "L",
    body: "La comparaison avec d'autres streamers du même niveau a tout changé. J'ai vu exactement où je perdais des viewers par rapport à eux. En un mois j'ai débloqué l'affiliation.",
    viewers: "0 → Affiliée",
    growth: "Affiliation",
  },
  {
    name: "StratoGG",
    handle: "@stratogg",
    avatar: "S",
    body: "Les données que je cherchais à compiler à la main depuis des mois, StreamPulse les donne en 60 secondes avec des recommandations claires. Un outil indispensable pour tout créateur sérieux.",
    viewers: "45 → 89",
    growth: "+98%",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="5 étoiles">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="hsl(var(--primary))" aria-hidden>
          <path d="M6 1l1.39 2.82L10.5 4.27l-2.25 2.19.53 3.09L6 7.97l-2.78 1.58.53-3.09L1.5 4.27l3.11-.45z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ t, visible, delay }: { t: Testimonial; visible: boolean; delay: number }) {
  return (
    <div style={anim(visible, delay)}>
      <div className="relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card px-6 py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,hsl(var(--primary)/0.04),transparent)]"
        />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="relative flex h-full flex-col">
          <Stars />

          <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
            "{t.body}"
          </p>

          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/25">
                {t.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">{t.handle}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="font-mono text-sm font-bold text-primary tabular-nums">{t.growth}</p>
              <p className="text-[10px] text-muted-foreground">{t.viewers} viewers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  const { ref, visible } = useVisible();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <section
        ref={ref}
        className="relative overflow-hidden border-t border-border/50 py-28"
      >
        <div className="absolute inset-0 bg-dot-grid opacity-[0.15]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_50%_110%,hsl(var(--primary)/0.07),transparent)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-accent/5 blur-[100px]"
        />

        <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
          {/* Header */}
          <div className="mb-14 text-center" style={anim(visible, 0)}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                style={{ animation: "ts-pulse 2s ease-in-out infinite" }}
              />
              Témoignages
            </span>

            <h2 className="mx-auto mt-4 max-w-lg text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Ils ont progressé avec StreamPulse
            </h2>

            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Des streamers comme toi qui ont transformé leurs données en résultats concrets.
            </p>
          </div>

          {/* Stats row */}
          <div
            className="mx-auto mb-14 grid max-w-lg grid-cols-3 gap-8 rounded-2xl border border-border/40 bg-card/60 px-8 py-6 backdrop-blur-sm"
            style={anim(visible, 80)}
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                  {s.val}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard
                key={t.handle}
                t={t}
                visible={visible}
                delay={160 + i * 120}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
