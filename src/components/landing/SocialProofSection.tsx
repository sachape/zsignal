import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import avatarGamer1 from "@/assets/avatar-gamer-1.jpg";
import avatarGamer2 from "@/assets/avatar-gamer-2.jpg";
import avatarGamer3 from "@/assets/avatar-gamer-3.jpg";

const useCountUp = (target: number, active: boolean, duration = 1400) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
};

const TESTIMONIALS = [
  {
    quote: "J'ai compris en 2 minutes pourquoi je stagnais depuis 3 mois. Le blocage identifié — ma régularité — était exactement le bon. J'ai fixé mes créneaux et mon score est passé de 41 à 68.",
    name: "Melvyn",
    role: "Streamer FPS · 280 followers",
    avatar: avatarGamer1,
  },
  {
    quote: "La feuille de route hebdomadaire est concrète et priorisée. Pour une fois, je sais exactement quoi travailler ce weekend — pas une liste de 20 conseils génériques.",
    name: "Camille",
    role: "Streameuse Just Chatting · 150 followers",
    avatar: avatarGamer2,
  },
  {
    quote: "Streamnco m'a montré que mon vrai problème c'était les clips, pas le stream lui-même. J'ai clipé systématiquement pendant 3 semaines — mon engagement a doublé.",
    name: "Théo",
    role: "Streamer compétitif · 420 followers",
    avatar: avatarGamer3,
  },
];

const SocialProofSection = () => {
  const { ref: statsRef, inView: statsInView } = useInViewOnce<HTMLDivElement>(0.3);
  const { ref: quotesRef, inView: quotesInView } = useInViewOnce<HTMLDivElement>(0.2);
  const count = useCountUp(8000, statsInView);

  return (
    <section className="bg-background py-14 md:py-20">
      <div className="container mx-auto max-w-5xl px-4 md:px-6">

        {/* Stats — fond crème, pas de bande colorée */}
        <div
          ref={statsRef}
          className="flex flex-col items-center gap-8 border-y-2 border-foreground/10 py-10 sm:flex-row sm:justify-center sm:gap-0 sm:divide-x-2 sm:divide-foreground/10"
        >
          <div
            className="flex flex-col items-center gap-1 sm:px-12"
            style={{
              opacity: statsInView ? 1 : 0,
              transform: statsInView ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <p className="font-display text-5xl font-bold text-foreground">
              {count.toLocaleString("fr-FR")}+
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">chaînes analysées</p>
          </div>

          <div
            className="flex flex-col items-center gap-1 sm:px-12"
            style={{
              opacity: statsInView ? 1 : 0,
              transform: statsInView ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 600ms cubic-bezier(0.16,1,0.3,1) 120ms, transform 600ms cubic-bezier(0.16,1,0.3,1) 120ms",
            }}
          >
            <div className="mb-1 flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
              ))}
            </div>
            <p className="font-display text-5xl font-bold text-foreground">
              4,8<span className="text-2xl font-medium text-muted-foreground">/5</span>
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">satisfaction moyenne</p>
          </div>

          <div
            className="flex flex-col items-center gap-1 sm:px-12"
            style={{
              opacity: statsInView ? 1 : 0,
              transform: statsInView ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 600ms cubic-bezier(0.16,1,0.3,1) 240ms, transform 600ms cubic-bezier(0.16,1,0.3,1) 240ms",
            }}
          >
            <p className="font-display text-5xl font-bold text-foreground">
              {"<"} 60<span className="text-2xl font-medium text-muted-foreground"> s</span>
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">diagnostic complet</p>
          </div>
        </div>

        {/* Testimonials */}
        <p className="mb-8 mt-14 text-center font-display text-2xl font-bold text-foreground md:text-3xl">
          Ce que disent les streamers ⚡
        </p>
        <div ref={quotesRef} className="grid gap-5 sm:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="flex flex-col justify-between rounded-2xl border-2 border-foreground/75 bg-card p-5"
              style={{
                opacity: quotesInView ? 1 : 0,
                transform: quotesInView ? "translateY(0)" : "translateY(16px)",
                transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
                boxShadow: "4px 4px 0 0 rgba(23,29,46,0.72)",
              }}
            >
              <div>
                <div className="mb-3 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-3 w-3 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{t.quote}</p>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt=""
                  loading="lazy"
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-foreground/20"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
