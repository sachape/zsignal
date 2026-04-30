import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";

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
    quote: "J'ai compris en 2 minutes pourquoi je stagnais depuis 3 mois. Le blocage identifié était exactement le bon.",
    name: "ReaperFPS",
    handle: "@reaperfps_tv",
    initials: "RF",
  },
  {
    quote: "Le plan d'action est concret et priorisé. Pour une fois, je sais exactement quoi travailler ce weekend.",
    name: "CastleQueen",
    handle: "@castlequeen",
    initials: "CQ",
  },
  {
    quote: "L'outil m'a montré que mon vrai problème c'était la régularité, pas le contenu. Ça change tout.",
    name: "MistralGaming",
    handle: "@mistralgaming",
    initials: "MG",
  },
];

const SocialProofSection = () => {
  const { ref: statsRef, inView: statsInView } = useInViewOnce<HTMLDivElement>(0.3);
  const { ref: quotesRef, inView: quotesInView } = useInViewOnce<HTMLDivElement>(0.2);
  const count = useCountUp(1200, statsInView);

  return (
    <section className="relative overflow-hidden border-y border-white/[0.05] bg-muted/[0.04] py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_70%)]" />

      <div className="container relative mx-auto max-w-5xl px-4 md:px-6">
        {/* Stats */}
        <div
          ref={statsRef}
          className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-0 sm:divide-x sm:divide-white/[0.07]"
        >
          {/* Chaînes analysées */}
          <div
            className="flex flex-col items-center gap-1 sm:px-10"
            style={{
              opacity: statsInView ? 1 : 0,
              transform: statsInView ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <p className="text-3xl font-bold tabular-nums text-foreground md:text-4xl">
              {count.toLocaleString("fr-FR")}+
            </p>
            <p className="text-xs text-muted-foreground">chaînes analysées</p>
          </div>

          {/* Satisfaction */}
          <div
            className="flex flex-col items-center gap-1 sm:px-10"
            style={{
              opacity: statsInView ? 1 : 0,
              transform: statsInView ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 600ms cubic-bezier(0.16,1,0.3,1) 120ms, transform 600ms cubic-bezier(0.16,1,0.3,1) 120ms",
            }}
          >
            <div className="flex items-center gap-0.5 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-3xl font-bold tabular-nums text-foreground md:text-4xl">
              4,8<span className="text-xl font-medium text-muted-foreground">/5</span>
            </p>
            <p className="text-xs text-muted-foreground">satisfaction moyenne</p>
          </div>

          {/* Temps */}
          <div
            className="flex flex-col items-center gap-1 sm:px-10"
            style={{
              opacity: statsInView ? 1 : 0,
              transform: statsInView ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 600ms cubic-bezier(0.16,1,0.3,1) 240ms, transform 600ms cubic-bezier(0.16,1,0.3,1) 240ms",
            }}
          >
            <p className="text-3xl font-bold text-foreground md:text-4xl">
              {"< 60"}<span className="ml-1 text-xl font-medium">s</span>
            </p>
            <p className="text-xs text-muted-foreground">diagnostic complet</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-auto mt-10 h-px max-w-xs bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* Testimonials */}
        <div
          ref={quotesRef}
          className="mt-10 grid gap-4 sm:grid-cols-3"
        >
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              style={{
                opacity: quotesInView ? 1 : 0,
                transform: quotesInView ? "translateY(0)" : "translateY(16px)",
                transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * 100}ms`,
              }}
              className="flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-card/40 p-5 backdrop-blur-xl"
            >
              <div>
                <span className="block text-xl font-bold leading-none text-primary/60 mb-2">"</span>
                <p className="text-sm leading-relaxed text-foreground/80">{t.quote}</p>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                  {t.initials}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.handle} · Twitch</p>
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
