import { Sprout, TrendingDown, LineChart } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { SectionHeading, SectionShell } from "./primitives";

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

const PersonasSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3);

  return (
    <SectionShell>
      <SectionHeading
        badge="Pour qui"
        title="Tu te reconnais ?"
        subtitle="StreamPulse s'adresse à trois profils — peu importe ton stade."
      />

      <div
        ref={ref}
        className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(16px)",
          transition:
            "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
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
              <Icon
                className={`h-4 w-4 ${highlighted ? "text-primary" : "text-foreground/70"}`}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{profile}</p>
              <p className="truncate text-[11.5px] text-foreground/65">{pitch}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};

export default PersonasSection;
