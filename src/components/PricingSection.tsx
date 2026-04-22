import { useRef, useState, useEffect, type CSSProperties } from "react";
import { CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CSS = `
  @keyframes pr-in {
    from { opacity:0; transform:translateY(22px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes pr-spin  { to { transform:rotate(360deg); } }
  @keyframes pr-pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
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
    ? { animation: `pr-in 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }
    : { opacity: 0 };
}

const FREE_FEATURES = [
  "Analyse complète de ta chaîne",
  "StreamScore instantané",
  "Top 3 recommandations",
  "Comparaison 1 concurrent",
  "Résultat en 60 secondes",
];

const PRO_FEATURES = [
  "Tout ce qui est gratuit",
  "Suivi hebdomadaire automatique",
  "Plan d'action détaillé 7 jours",
  "Comparaison illimitée",
  "Alertes progression affiliation",
  "Historique et tendances 90 jours",
  "Accès prioritaire aux nouvelles fonctions",
];

export default function PricingSection() {
  const { ref, visible } = useVisible();
  const navigate = useNavigate();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <section
        ref={ref}
        className="relative overflow-hidden border-t border-border/50 py-28"
      >
        <div className="absolute inset-0 bg-dot-grid opacity-[0.15]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.08),transparent)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full bg-primary/5 blur-[120px]"
        />

        <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
          {/* Header */}
          <div className="mb-14 text-center" style={anim(visible, 0)}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                style={{ animation: "pr-pulse 2s ease-in-out infinite" }}
              />
              Tarifs
            </span>

            <h2 className="mx-auto mt-4 max-w-lg text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Simple et transparent
            </h2>

            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Commence gratuitement, passe à Pro quand tu es prêt à passer au niveau supérieur.
            </p>
          </div>

          {/* Cards */}
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">

            {/* Free */}
            <div style={anim(visible, 100)}>
              <div className="relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card px-7 py-8">
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Gratuit
                </p>
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-mono text-4xl font-bold tabular-nums text-foreground">0 €</span>
                  <span className="mb-1 text-sm text-muted-foreground">/ toujours</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Une analyse complète, sans compte requis.
                </p>

                <ul className="mt-7 space-y-3">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate("/")}
                  className="mt-8 w-full cursor-pointer rounded-xl border border-border/60 bg-muted/40 py-2.5 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted/70"
                >
                  Analyser maintenant
                </button>
              </div>
            </div>

            {/* Pro — rotating border beam */}
            <div style={anim(visible, 200)}>
              <div className="relative h-full overflow-hidden rounded-2xl">
                {/* Spinning border beam */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute"
                  style={{
                    top: "-50%", left: "-50%", width: "200%", height: "200%",
                    background: "conic-gradient(from 0deg, transparent 0deg, hsl(95,98%,61%,.65) 38deg, hsl(172,66%,50%,.45) 58deg, transparent 85deg)",
                    animation: "pr-spin 7s linear infinite",
                  }}
                />
                <div className="absolute inset-[1px] rounded-[15px] bg-card" />

                <div className="relative z-10 px-7 py-8">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                      Pro
                    </p>
                    <span className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                      Recommandé
                    </span>
                  </div>

                  <div className="mt-3 flex items-end gap-1">
                    <span className="font-mono text-4xl font-bold tabular-nums text-foreground">9 €</span>
                    <span className="mb-1 text-sm text-muted-foreground">/ mois</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pour les streamers qui veulent progresser en continu.
                  </p>

                  <ul className="mt-7 space-y-3">
                    {PRO_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate("/auth")}
                    className="mt-8 w-full cursor-pointer rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-shadow duration-300 hover:shadow-[0_0_32px_hsl(var(--primary)/0.6)]"
                  >
                    Commencer l'essai gratuit
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground" style={anim(visible, 300)}>
            Pas de carte bancaire requise · Annulation à tout moment · Données sécurisées
          </p>
        </div>
      </section>
    </>
  );
}
