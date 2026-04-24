import { Quote } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "./primitives";

const REASONS = [
  {
    title: "Diagnostic clair, pas un dump de chiffres",
    body: "On formule ce qui bloque vraiment, en français — pas en jargon analytics.",
  },
  {
    title: "Lecture seule, données publiques",
    body: "Aucune publication, aucune action sur ta chaîne. Tu testes sans risque.",
  },
  {
    title: "Pensé pour les vraies tailles de chaîne",
    body: "Du débutant à l'affilié — pas calibré pour les méga-streamers.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "J'ai compris en 2 minutes ce qui bloquait ma chaîne depuis des mois. Le diagnostic était direct, sans jargon.",
    name: "Léa M.",
    handle: "@leaplays_fr",
  },
  {
    quote:
      "Enfin un outil qui me dit quoi faire au lieu de me noyer dans les chiffres. J'applique le plan chaque semaine.",
    name: "Maxime D.",
    handle: "@maxstream",
  },
];

const SocialProofSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);

  return (
    <SectionShell>
      <SectionHeading
        badge="Pourquoi StreamPulse"
        title="Pourquoi les streamers reviennent"
        subtitle="Trois choses que tu ne trouves pas dans les outils analytics classiques."
      />

      <div ref={ref} className="mx-auto mt-12 max-w-5xl space-y-8">
        {/* Reasons row */}
        <div className="grid gap-4 md:grid-cols-3">
          {REASONS.map((r, i) => (
            <div
              key={r.title}
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 700ms ease-out ${i * 110}ms, transform 700ms ease-out ${i * 110}ms`,
              }}
            >
              <GlassCard className="h-full p-6">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-[11px] font-bold tabular-nums text-primary">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold leading-snug text-foreground">
                  {r.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                  {r.body}
                </p>
              </GlassCard>
            </div>
          ))}
        </div>

        {/* Testimonials — 2 sober quotes */}
        <div className="grid gap-4 md:grid-cols-2">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.handle}
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${300 + i * 120}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${300 + i * 120}ms`,
              }}
            >
              <GlassCard className="h-full p-6">
                <Quote className="h-5 w-5 text-primary/50" />
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {t.quote}
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-xs font-semibold text-foreground">
                    {t.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {t.name}
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        {t.handle}
                      </span>
                    </p>
                    <MicroLabel>Témoignage utilisateur</MicroLabel>
                  </div>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
};

export default SocialProofSection;
