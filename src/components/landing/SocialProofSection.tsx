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

// Specific, credible, outcome-focused testimonials
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

const STATS = [
  { value: 8000, suffix: "+", label: "chaînes analysées", duration: 1200 },
  { value: 48, suffix: "/5", label: "satisfaction moyenne", static: "4,8", duration: 0 },
  { value: 60, suffix: " s", label: "diagnostic complet", prefix: "< ", duration: 0 },
];

// Scrolling proof band — continuous motion, visible at a glance.
const CATEGORIES = [
  "Just Chatting", "League of Legends", "Valorant", "Fortnite", "Minecraft",
  "GTA RP", "Counter-Strike", "Rocket League", "Apex Legends", "Speedrun",
  "IRL", "Trackmania",
];

const SocialProofSection = () => {
  const { ref: statsRef, inView: statsInView } = useInViewOnce<HTMLDivElement>(0.3);
  const { ref: quotesRef, inView: quotesInView } = useInViewOnce<HTMLDivElement>(0.2);
  const count = useCountUp(8000, statsInView);

  return (
    <section className="relative overflow-hidden border-y border-white/[0.05] bg-muted/[0.03] py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_70%)]" />

      <div className="container relative mx-auto max-w-5xl px-4 md:px-6">
        {/* Category marquee — continuous motion, "used across every category" */}
        <div className="mb-10">
          <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/50">
            Analysé sur toutes les catégories Twitch
          </p>
          <div className="landing-marquee-mask relative overflow-hidden">
            <div className="landing-marquee flex w-max items-center gap-3" style={{ ["--marquee-duration" as string]: "34s" }}>
              {[...CATEGORIES, ...CATEGORIES].map((cat, i) => (
                <span
                  key={`${cat}-${i}`}
                  className="shrink-0 rounded-full border border-white/[0.07] bg-card/40 px-4 py-1.5 text-xs font-medium text-foreground/70 backdrop-blur-sm"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          ref={statsRef}
          className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-0 sm:divide-x sm:divide-white/[0.06]"
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
            <p className="text-xs text-muted-foreground/70">chaînes analysées</p>
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
                <Star key={i} className="h-3 w-3 fill-primary text-primary-strong" />
              ))}
            </div>
            <p className="text-3xl font-bold tabular-nums text-foreground md:text-4xl">
              4,8<span className="text-xl font-medium text-muted-foreground">/5</span>
            </p>
            <p className="text-xs text-muted-foreground/70">satisfaction moyenne</p>
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
            <p className="text-xs text-muted-foreground/70">diagnostic complet</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-auto mt-10 h-px max-w-xs bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

        {/* Testimonials */}
        <div ref={quotesRef} className="mt-10 grid gap-4 sm:grid-cols-3">
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
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-2.5 w-2.5 fill-primary text-primary-strong" />
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
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/[0.08]"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground/60">{t.role}</p>
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
