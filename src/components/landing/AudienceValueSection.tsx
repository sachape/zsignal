import {
  Sprout,
  TrendingDown,
  LineChart,
  History,
  Users,
  Map,
  Bell,
} from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "./primitives";

const PERSONAS = [
  {
    icon: Sprout,
    profile: "Tu débutes",
    pitch: "Pose les bonnes bases dès le départ.",
  },
  {
    icon: TrendingDown,
    profile: "Tu stagnes",
    pitch: "Tu publies mais ta croissance est bloquée.",
    highlighted: true,
  },
  {
    icon: LineChart,
    profile: "Tu structures",
    pitch: "Tu veux décider avec des données.",
  },
];

const FEATURES = [
  {
    icon: History,
    label: "Historique",
    title: "Vois ta progression dans le temps",
    description:
      "Score, viewers, régularité, objectifs : tout est suivi semaine après semaine pour repérer ce qui marche vraiment.",
    hero: true,
    span: "md:col-span-4",
  },
  {
    icon: Bell,
    label: "Suivi",
    title: "Sois alerté quand ton diagnostic évolue",
    description:
      "Score qui chute, blocage qui change, nouvel objectif débloqué : tu restes au courant sans avoir à relancer une analyse.",
    hero: false,
    span: "md:col-span-2",
  },
  {
    icon: Map,
    label: "Plan détaillé",
    title: "Un plan d'action enrichi, pas une seule action",
    description:
      "Au-delà de la première action prioritaire, vois la séquence complète à exécuter pour passer le prochain cap.",
    hero: false,
    span: "md:col-span-2",
  },
  {
    icon: Users,
    label: "Concurrents",
    title: "Compare-toi à des chaînes vraiment pertinentes",
    description:
      "Pas un benchmark flou contre tout Twitch : des comparaisons utiles à ton niveau, ta langue, ton format.",
    hero: true,
    span: "md:col-span-4",
  },
];

const AudienceValueSection = () => {
  const { ref: personasRef, inView: personasInView } =
    useInViewOnce<HTMLDivElement>(0.3);
  const { ref: featuresRef, inView: featuresInView } =
    useInViewOnce<HTMLDivElement>(0.2);

  const stagger = (i: number, active: boolean) => ({
    opacity: active ? 1 : 0,
    transform: active ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
  });

  return (
    <SectionShell id="features">
      <SectionHeading
        badge="Pour qui"
        title="Construit pour les streamers qui veulent vraiment progresser"
        subtitle="Quel que soit ton stade, Streamnco te montre où tu en es — et ce qui reste à débloquer avec le suivi complet."
      />

      {/* Personas */}
      <div
        ref={personasRef}
        className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-3 md:mt-10"
        style={{
          opacity: personasInView ? 1 : 0,
          transform: personasInView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {PERSONAS.map(({ icon: Icon, profile, pitch, highlighted }) => (
          <div
            key={profile}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur-xl transition-colors ${
              highlighted
                ? "border-primary/25 bg-primary/[0.06]"
                : "border-white/[0.06] bg-card/40"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                highlighted ? "bg-primary/15" : "bg-muted/40"
              }`}
            >
              <Icon className={`h-4 w-4 ${highlighted ? "text-primary" : "text-foreground/70"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{profile}</p>
              <p className="text-[11.5px] text-foreground/65 leading-snug">{pitch}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Features — bento grid */}
      <div className="mx-auto mt-10 max-w-6xl md:mt-12">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wider text-foreground/60">
          Ce que tu débloques avec le suivi complet
        </p>
        <div
          ref={featuresRef}
          className="grid grid-cols-1 gap-4 md:grid-cols-6"
        >
          {FEATURES.map((feat, i) => {
            const { icon: Icon } = feat;
            return (
              <div key={feat.title} style={stagger(i, featuresInView)} className={feat.span}>
                <GlassCard hero={feat.hero} className="flex h-full flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <MicroLabel>{feat.label}</MicroLabel>
                      <h3 className="mt-1 text-base font-semibold leading-snug text-foreground md:text-lg">
                        {feat.title}
                      </h3>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                    {feat.description}
                  </p>
                </GlassCard>
              </div>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
};

export default AudienceValueSection;
