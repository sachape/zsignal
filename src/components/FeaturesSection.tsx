import { useRef, useState, useEffect, type CSSProperties } from "react";
import { Calendar, GitCompare, Trophy, Clock } from "lucide-react";

const SCORE = 62;
const RING_R = 38;
const RING_CIRC = 2 * Math.PI * RING_R;
const RING_SZ = 96;
const RC = RING_SZ / 2;

const CSS = `
  @keyframes ft-in {
    from { opacity:0; transform:translateY(22px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes ft-spin  { to { transform:rotate(360deg); } }
  @keyframes ft-pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
  @keyframes ft-bar   { from { width:0%; } to { width:var(--w); } }
  @keyframes ft-shimmer {
    from { transform:translateX(-100%); }
    to   { transform:translateX(200%); }
  }
`;

function useVisible(threshold = 0.18) {
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
    ? { animation: `ft-in 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }
    : { opacity: 0 };
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/* ── StreamScore hero cell ───────────────────────────────────────────── */
function ScoreCell({ visible }: { visible: boolean }) {
  const [display, setDisplay] = useState(0);
  const [ringOff, setRingOff] = useState(RING_CIRC);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => {
      const dur = 1500;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / dur, 1);
        const e = easeOut(t);
        setDisplay(Math.round(e * SCORE));
        setRingOff(RING_CIRC * (1 - (e * SCORE) / 100));
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, 400);
    return () => { clearTimeout(id); cancelAnimationFrame(rafRef.current); };
  }, [visible]);

  return (
    <div className="sm:col-span-2" style={anim(visible, 0)}>
      {/* Rotating border beam wrapper */}
      <div className="relative overflow-hidden rounded-2xl h-full">
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "-50%", left: "-50%", width: "200%", height: "200%",
            background: "conic-gradient(from 0deg, transparent 0deg, hsl(95,98%,61%,.6) 38deg, hsl(172,66%,50%,.4) 58deg, transparent 85deg)",
            animation: "ft-spin 7s linear infinite",
          }}
        />
        <div className="absolute inset-[1px] rounded-[15px] bg-card" />

        <div className="relative z-10 flex flex-col gap-6 p-7 h-full sm:flex-row sm:items-center">
          {/* Ring */}
          <div className="relative shrink-0">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 scale-[2] rounded-full bg-primary/20 blur-2xl opacity-60"
            />
            <svg width={RING_SZ} height={RING_SZ} className="-rotate-90 relative" aria-hidden>
              <defs>
                <linearGradient id="ft-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(95,98%,61%)" />
                  <stop offset="100%" stopColor="hsl(172,66%,50%)" />
                </linearGradient>
              </defs>
              <circle cx={RC} cy={RC} r={RING_R} fill="none" stroke="hsl(220,14%,16%)" strokeWidth="6" />
              <circle
                cx={RC} cy={RC} r={RING_R} fill="none"
                stroke="url(#ft-ring-grad)" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC} strokeDashoffset={ringOff}
                style={{ transition: "stroke-dashoffset 0.05s linear", filter: "drop-shadow(0 0 5px hsl(95,98%,61%,.5))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold tabular-nums leading-none text-foreground">
                {display}
              </span>
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Copy */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                style={{ animation: "ft-pulse 2s ease-in-out infinite" }}
              />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                StreamScore
              </span>
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              Ton score global, chaque semaine
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Un indice composite 0–100 qui agrège engagement, régularité, croissance et
              qualité de contenu. Suis ta progression semaine après semaine.
            </p>

            {/* Mini score breakdown */}
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: "Engagement", pct: 78 },
                { label: "Régularité", pct: 65 },
                { label: "Croissance", pct: 52 },
                { label: "Contenu", pct: 71 },
              ].map(({ label, pct }, i) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>{label}</span>
                    <span className="tabular-nums text-foreground">{visible ? pct : 0}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted/50">
                    <div
                      className="relative h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{
                        "--w": `${pct}%`,
                        width: visible ? `${pct}%` : "0%",
                        transition: `width 0.8s cubic-bezier(0.16,1,0.3,1) ${300 + i * 120}ms`,
                      } as CSSProperties}
                    >
                      {visible && (
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: "linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent)",
                            animation: `ft-shimmer 1.4s ease ${600 + i * 120}ms 1`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Simple feature cell ─────────────────────────────────────────────── */
function FeatureCell({
  icon: Icon,
  label,
  description,
  badge,
  visible,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  badge?: string;
  visible: boolean;
  delay: number;
}) {
  return (
    <div style={anim(visible, delay)}>
      <div className="relative h-full rounded-2xl border border-border/50 bg-card px-6 py-6 overflow-hidden">
        {/* Subtle top-edge glow */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,hsl(var(--primary)/0.04),transparent)]"
        />

        <div className="relative">
          {badge && (
            <span className="mb-4 inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              {badge}
            </span>
          )}

          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Icon className="h-[18px] w-[18px] text-primary" />
          </div>

          <h3 className="text-base font-semibold tracking-tight text-foreground">{label}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Plan hebdo hero cell ────────────────────────────────────────────── */
function PlanCell({ visible }: { visible: boolean }) {
  const tasks = [
    { text: "Streame mardi entre 20h–22h", done: true },
    { text: "Teste un titre avec question", done: true },
    { text: "Réponds aux clips dans 24h", done: false },
    { text: "Collabore avec un streamer +10%", done: false },
  ];

  return (
    <div className="sm:col-span-2" style={anim(visible, 80)}>
      <div className="relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card px-7 py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_80%_0%,hsl(var(--primary)/0.06),transparent)]"
        />

        <div className="relative">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary"
              style={{ animation: "ft-pulse 2s ease-in-out infinite" }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Plan hebdomadaire
            </span>
          </div>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            4 actions concrètes cette semaine
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Pas de rapport générique — un plan priorisé selon tes données réelles.
          </p>

          <ul className="mt-5 space-y-2.5">
            {tasks.map((t, i) => (
              <li
                key={t.text}
                className="flex items-start gap-3"
                style={visible ? {
                  animation: `ft-in 0.5s cubic-bezier(0.16,1,0.3,1) ${500 + i * 100}ms both`,
                } : { opacity: 0 }}
              >
                <span
                  className={[
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    t.done
                      ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                      : "bg-muted/60 text-muted-foreground ring-1 ring-border/60",
                  ].join(" ")}
                >
                  {t.done ? "✓" : (i + 1)}
                </span>
                <span
                  className={[
                    "text-sm leading-relaxed",
                    t.done ? "text-muted-foreground line-through" : "text-foreground",
                  ].join(" ")}
                >
                  {t.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── Root section ────────────────────────────────────────────────────── */
export default function FeaturesSection() {
  const { ref, visible } = useVisible();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <section
        ref={ref}
        className="relative overflow-hidden border-t border-border/50 py-28"
      >
        <div className="absolute inset-0 bg-dot-grid opacity-[0.15]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.07),transparent)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-1/3 h-96 w-96 rounded-full bg-accent/5 blur-[120px]"
        />

        <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
          {/* Header */}
          <div className="mb-14 text-center" style={anim(visible, 0)}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                style={{ animation: "ft-pulse 2s ease-in-out infinite" }}
              />
              Fonctionnalités
            </span>

            <h2 className="mx-auto mt-4 max-w-lg text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Ce que StreamPulse fait pour toi
            </h2>

            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Analyse, compare, planifie — tout ce qu'il faut pour transformer
              des données brutes en progression réelle.
            </p>
          </div>

          {/* Bento grid — row 1 */}
          <div className="grid gap-4 sm:grid-cols-3">
            <ScoreCell visible={visible} />

            <FeatureCell
              icon={GitCompare}
              label="Comparaison concurrents"
              description="Mesure-toi à des streamers similaires et identifie les gaps à combler en priorité."
              visible={visible}
              delay={160}
            />

            {/* Row 2 */}
            <PlanCell visible={visible} />

            <FeatureCell
              icon={Clock}
              label="Meilleur créneau"
              description="Détecte automatiquement l'heure où ton audience est la plus réceptive pour maximiser tes viewers."
              visible={visible}
              delay={240}
            />

            <FeatureCell
              icon={Trophy}
              label="Suivi affiliation"
              description="Visualise ta progression vers les paliers Twitch et sache exactement combien d'heures ou d'abonnés il te manque."
              badge="Twitch"
              visible={visible}
              delay={320}
            />

            <FeatureCell
              icon={Calendar}
              label="Consistance & régularité"
              description="Analyse tes habitudes de stream sur 30 jours et mesure l'impact direct de ta régularité sur ta croissance."
              visible={visible}
              delay={400}
            />
          </div>
        </div>
      </section>
    </>
  );
}
