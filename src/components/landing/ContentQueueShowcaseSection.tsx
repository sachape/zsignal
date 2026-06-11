import { Link } from "react-router-dom";
import { ArrowRight, ListChecks, Clapperboard, Palette, Sparkles, Clock, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading, SectionShell } from "./primitives";
import { useInViewOnce } from "@/hooks/useInViewOnce";

type Status = "ready" | "draft" | "scheduled";

const COLUMNS: { title: string; status: Status; icon: typeof Clock; items: { type: "Clip" | "Visuel"; title: string; meta: string }[] }[] = [
  {
    title: "Brouillons",
    status: "draft",
    icon: FileText,
    items: [
      { type: "Visuel", title: "Bannière event", meta: "3 variantes" },
      { type: "Clip", title: "Reaction stream", meta: "00:38" },
    ],
  },
  {
    title: "Prêts à publier",
    status: "ready",
    icon: CheckCircle2,
    items: [
      { type: "Clip", title: "Triple kill Apex", meta: "00:42 · 9:16" },
      { type: "Visuel", title: "Story annonce live", meta: "Story 9:16" },
      { type: "Clip", title: "Best moment chill", meta: "01:12 · 9:16" },
    ],
  },
  {
    title: "Programmés",
    status: "scheduled",
    icon: Clock,
    items: [
      { type: "Visuel", title: "Post collab samedi", meta: "Post 1:1" },
      { type: "Clip", title: "Recap semaine", meta: "00:58 · 9:16" },
    ],
  },
];

const statusTone: Record<Status, string> = {
  ready: "text-primary",
  draft: "text-muted-foreground",
  scheduled: "text-info",
};

const statusDot: Record<Status, string> = {
  ready: "bg-primary",
  draft: "bg-muted-foreground/50",
  scheduled: "bg-info",
};

const ContentQueueShowcaseSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

  return (
    <SectionShell id="content-queue-showcase" tone="light">
      <SectionHeading
        badgeTone="light"
        badge="Organisation · File de contenu"
        title="Tout ton contenu prêt à publier, au même endroit"
        subtitle="Tes clips et tes visuels arrivent automatiquement dans la file. Tu organises, tu programmes, tu publies."
      />

      <div
        ref={ref}
        className="mx-auto mt-12 grid max-w-6xl gap-4 md:grid-cols-3"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {COLUMNS.map((col, colIdx) => (
          <div
            key={col.title}
            className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-card/80 to-card/40 p-5 backdrop-blur-xl"
            style={{ transitionDelay: `${colIdx * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${statusDot[col.status]}`} />
                <span className="text-xs font-semibold text-foreground">{col.title}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{col.items.length}</span>
            </div>

            <div className="mt-4 space-y-2.5">
              {col.items.map((item, i) => {
                const Icon = item.type === "Clip" ? Clapperboard : Palette;
                return (
                  <div
                    key={i}
                    className="group/item rounded-xl border border-white/[0.06] bg-background/40 p-3 transition-all hover:border-primary/25 hover:bg-background/60"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-foreground">{item.title}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{item.type}</span>
                          <span>·</span>
                          <span>{item.meta}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Légende bénéfices */}
      <div className="mx-auto mt-10 grid max-w-4xl gap-3 md:grid-cols-3">
        {[
          { icon: Sparkles, label: "Création automatique", desc: "Tes clips et visuels arrivent ici sans copier-coller." },
          { icon: ListChecks, label: "Statuts clairs", desc: "Brouillon, prêt, programmé : tu vois ce qui reste à faire." },
          { icon: CheckCircle2, label: "Téléchargement direct", desc: "Récupère un fichier prêt à publier en un clic." },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="rounded-2xl border border-white/[0.06] bg-background/30 p-4">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{label}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Button asChild variant="outline">
          <Link to="/fonctionnalites#file-de-contenu">
            Voir la file de contenu
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Reference variable used to keep TS happy if needed */}
      <span className="hidden">{statusTone.ready}</span>
    </SectionShell>
  );
};

export default ContentQueueShowcaseSection;
