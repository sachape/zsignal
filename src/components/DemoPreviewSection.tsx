import { Activity, ArrowRight, Clapperboard, ListChecks, Palette, Sparkles, Type } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";

const CAPTION_STYLES = ["Bold", "Clean", "Creator"];

const QUEUE_ITEMS = [
  { type: "Clip", title: "Clutch final", status: "Prêt" },
  { type: "Visuel", title: "Annonce live", status: "Brouillon" },
  { type: "Clip", title: "Moment drôle", status: "À vérifier" },
] as const;

const FORMAT_ITEMS = ["Bannière Twitch", "Story verticale", "Post carré", "Offline screen"];

const DemoPreviewSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.25);

  return (
    <section id="preview" className="relative overflow-hidden py-20 md:py-24 scroll-mt-24 md:scroll-mt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(190,255,90,0.12),transparent_58%)]" />
      <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-strong">
            <Sparkles className="h-3 w-3" />
            Aperçu produit
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Un studio de création, avec une mémoire.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Streamnco ne se limite pas à générer un asset. Il garde ton contexte : ce qui est prêt, ce qui reste à faire, et ce que tes données Twitch suggèrent d'améliorer.
          </p>
        </div>

        <div
          ref={ref}
          className="mx-auto mt-12 grid max-w-6xl gap-4 lg:grid-cols-[1.04fr_0.96fr]"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(22px)",
            transition: "opacity 800ms cubic-bezier(0.16,1,0.3,1), transform 800ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1116]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4 text-primary-strong" />
                <p className="text-sm font-semibold text-foreground">Clipping</p>
              </div>
              <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] text-muted-foreground">
                9:16 · export manuel
              </span>
            </div>

            <div className="grid gap-px bg-white/[0.05] md:grid-cols-[0.55fr_1fr]">
              <div className="bg-[#0d1116] p-5">
                <div className="mx-auto aspect-[9/16] max-w-[210px] overflow-hidden rounded-xl border border-white/[0.08] bg-black">
                  <div className="h-[42%] bg-[linear-gradient(135deg,#26313a,#111820)] p-4">
                    <div className="h-full rounded-lg border border-cyan-200/[0.15] bg-cyan-200/10" />
                  </div>
                  <div className="relative h-[58%] bg-[linear-gradient(135deg,#182012,#070909)] p-4">
                    <div className="h-24 rounded-lg border border-primary/20 bg-primary/10" />
                    <div className="absolute bottom-14 left-5 right-5 rounded-md bg-black/80 px-3 py-2 text-center text-[12px] font-black uppercase leading-tight text-white">
                      meilleur moment du live
                    </div>
                    <div className="absolute bottom-5 left-5 right-5 h-1.5 rounded-full bg-white/10">
                      <div className="h-full w-[68%] rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0d1116] p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {CAPTION_STYLES.map((style) => (
                    <div key={style} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
                      <Type className="h-4 w-4 text-primary-strong" />
                      <p className="mt-3 text-sm font-semibold text-foreground">{style}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Style sous-titres</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.035] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pipeline</p>
                  <div className="mt-4 grid gap-2">
                    {["Source", "Facecam + gameplay", "Sous-titres", "Téléchargement"].map((item, index) => (
                      <div key={item} className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary-strong">
                          {index + 1}
                        </span>
                        <span className="text-sm text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d1116] p-5">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-cyan-200" />
                <p className="text-sm font-semibold text-foreground">Studio visuel</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {FORMAT_ITEMS.map((format) => (
                  <div key={format} className="rounded-lg border border-cyan-200/10 bg-cyan-200/[0.045] p-3">
                    <div className="h-14 rounded-md bg-[linear-gradient(135deg,rgba(103,232,249,0.18),rgba(255,255,255,0.04))]" />
                    <p className="mt-2 text-xs font-medium text-foreground">{format}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0d1116] p-5">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-amber-200" />
                  <p className="text-sm font-semibold text-foreground">File de contenu</p>
                </div>
                <div className="mt-4 space-y-2">
                  {QUEUE_ITEMS.map((item) => (
                    <div key={item.title} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.035] px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">{item.type}</p>
                      </div>
                      <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-muted-foreground">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0d1116] p-5">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary-strong" />
                  <p className="text-sm font-semibold text-foreground">StreamScore</p>
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-5xl font-bold text-foreground">73</p>
                    <p className="mt-1 text-xs text-muted-foreground">Score global</p>
                  </div>
                  <ArrowRight className="mb-3 h-5 w-5 text-primary-strong" />
                </div>
                <div className="mt-5 space-y-2">
                  {["Régularité", "Contenus", "Positionnement"].map((item, index) => (
                    <div key={item}>
                      <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>{item}</span>
                        <span>{[78, 54, 69][index]}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${[78, 54, 69][index]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-9 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
          Les réseaux connectés sont volontairement traités comme une évolution. Le produit actuel privilégie un workflow fiable : créer, préparer, télécharger, puis publier manuellement.
        </p>
      </div>
    </section>
  );
};

export default DemoPreviewSection;
