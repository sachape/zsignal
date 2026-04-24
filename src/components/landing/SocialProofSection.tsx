import { Zap, ShieldCheck, ArrowUpRight } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import {
  GlassCard,
  SectionHeading,
  SectionShell,
} from "./primitives";

const PILLARS = [
  {
    icon: Zap,
    title: "Diagnostic en moins d'une minute",
    body: "Tu entres ton pseudo, tu obtiens un score lu humainement et un blocage principal nommé clairement.",
  },
  {
    icon: ShieldCheck,
    title: "Aucune connexion Twitch requise pour commencer",
    body: "Lecture seule, données publiques uniquement. Tu testes la valeur avant même de créer un compte.",
  },
  {
    icon: ArrowUpRight,
    title: "Passage au suivi complet quand tu veux aller plus loin",
    body: "L'aperçu reste honnête sur ses limites. Le suivi complet ouvre l'historique et le plan d'action enrichi.",
  },
];

const NOTES = [
  {
    quote:
      "J'ai enfin compris ce qui freinait mes lives. Je tournais autour du problème depuis des mois.",
    name: "Léa M.",
    context: "Streameuse variety, ~15 viewers moy.",
  },
  {
    quote:
      "Le plus utile, c'est de voir quoi corriger en premier. Je perds moins de temps à tester au hasard.",
    name: "Maxime D.",
    context: "Stream FPS, vise l'affiliation",
  },
];

const SocialProofSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);

  return (
    <SectionShell>
      <SectionHeading
        badge="Pourquoi StreamPulse"
        title="Pourquoi les streamers reviennent sur StreamPulse"
        subtitle="Pas pour regarder un dashboard. Pour comprendre plus vite, corriger plus juste et suivre leur progression dans le temps."
      />

      <div ref={ref} className="mx-auto mt-12 max-w-5xl space-y-6">
        {/* Pillars */}
        <div className="grid gap-4 md:grid-cols-3">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(20px)",
                  transition: `opacity 700ms ease-out ${i * 110}ms, transform 700ms ease-out ${i * 110}ms`,
                }}
              >
                <GlassCard className="h-full p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold leading-snug text-foreground">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                    {p.body}
                  </p>
                </GlassCard>
              </div>
            );
          })}
        </div>

        {/* Sober notes — not over-styled, no fake star ratings */}
        <div className="grid gap-4 md:grid-cols-2">
          {NOTES.map((t, i) => (
            <div
              key={t.name}
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${300 + i * 120}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${300 + i * 120}ms`,
              }}
            >
              <GlassCard className="h-full p-6">
                <p className="text-sm leading-relaxed text-foreground/90">
                  « {t.quote} »
                </p>
                <div className="mt-4 flex items-baseline gap-2 border-t border-white/[0.06] pt-3">
                  <p className="text-xs font-semibold text-foreground">{t.name}</p>
                  <span className="text-[11px] text-muted-foreground">
                    — {t.context}
                  </span>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Déjà utilisé pour analyser des chaînes Twitch à différents stades de progression.
        </p>
      </div>
    </SectionShell>
  );
};

export default SocialProofSection;
