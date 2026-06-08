import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ListChecks, ShieldCheck, Timer, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeroChannelSearch from "@/components/HeroChannelSearch";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";

const HeroSection = () => {
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleAnalyze = (explicitLogin?: string, gameNameHint?: string | null) => {
    const login = explicitLogin?.trim().toLowerCase() || normalizeChannelInput(username);
    if (!login) {
      setInputError("Entre un nom d'utilisateur Twitch valide ou une URL twitch.tv/...");
      return;
    }
    setInputError(null);
    const hint = gameNameHint ? `&hint_game=${encodeURIComponent(gameNameHint)}` : "";
    navigate(`/analyze?channel=${encodeURIComponent(login)}&mode=teaser${hint}`);
  };

  const ringScore = 64;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (ringScore / 100) * circumference;

  return (
    <section className="relative overflow-hidden pt-24 pb-10 sm:pt-28 sm:pb-14 md:pt-32 md:pb-20">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)] opacity-50" />

      {/* Floating card — StreamScore */}
      <div
        className="pointer-events-none absolute right-[6%] top-[26%] hidden lg:block xl:right-[10%]"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 1000ms ease-out 500ms, transform 1200ms cubic-bezier(0.16,1,0.3,1) 500ms",
        }}
        aria-hidden
      >
        <div style={{ animation: "hero-float 6s ease-in-out infinite" }}>
          <div className="relative rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16">
                <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
                  <defs>
                    <linearGradient id="heroRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--primary) / 0.4)" />
                    </linearGradient>
                  </defs>
                  <circle cx="30" cy="30" r={radius} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.3" strokeWidth="4" />
                  <circle cx="30" cy="30" r={radius} fill="none" stroke="url(#heroRingGrad)" strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold tabular-nums">{ringScore}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-foreground/60">StreamScore</span>
                <span className="text-sm font-semibold text-foreground">Score de chaîne</span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                  <Activity className="h-2.5 w-2.5" /> Diagnostic instantané
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating card — Blocage principal */}
      <div
        className="pointer-events-none absolute left-[6%] top-[34%] hidden lg:block xl:left-[10%]"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 1000ms ease-out 650ms, transform 1200ms cubic-bezier(0.16,1,0.3,1) 650ms",
        }}
        aria-hidden
      >
        <div style={{ animation: "hero-float 7.5s ease-in-out infinite 0.3s" }}>
          <div className="relative w-[210px] rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.3)]">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/15">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              </div>
              <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-foreground/60">Blocage #1</span>
            </div>
            <p className="mt-2 text-xs font-semibold leading-snug text-foreground">
              Régularité de planning trop faible
            </p>
            <p className="mt-1 text-[10px] leading-snug text-foreground/65">
              Créneaux instables sur 30 jours
            </p>
          </div>
        </div>
      </div>

      {/* Floating card — Plan d'action */}
      <div
        className="pointer-events-none absolute right-[8%] top-[68%] hidden lg:block xl:right-[12%]"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(40px)",
          transition: "opacity 1000ms ease-out 800ms, transform 1200ms cubic-bezier(0.16,1,0.3,1) 800ms",
        }}
        aria-hidden
      >
        <div style={{ animation: "hero-float 8s ease-in-out infinite 1s" }}>
          <div className="relative w-[220px] rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.3)]">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                <ListChecks className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-foreground/60">Plan d'action</span>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-[11px] text-foreground/90">
              {["Fixer 2 créneaux récurrents", "Retravailler tes titres VOD", "Cibler 1 catégorie pivot"].map((step, i) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[8px] font-bold text-primary">{i + 1}</span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Ambient glows */}
      <div className="pointer-events-none absolute right-[6%] top-[40%] hidden h-40 w-40 rounded-full bg-primary/15 blur-3xl lg:block" aria-hidden />
      <div className="pointer-events-none absolute left-[6%] top-[55%] hidden h-32 w-32 rounded-full bg-primary/10 blur-3xl lg:block" aria-hidden />

      <div className="container relative mx-auto max-w-6xl px-4 text-center md:px-6">
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
            <Zap className="h-3 w-3" />
            8 000+ chaînes analysées
          </span>

          {/* Headline — outcome-first, specific, creates curiosity gap */}
          <h1 className="font-display mx-auto mt-5 max-w-3xl bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl lg:text-[4.25rem] lg:leading-[1.05]">
            Découvre en 60 secondes ce qui bloque ta chaîne Twitch.
          </h1>

          {/* Subline — mechanism, specificity */}
          <p className="mx-auto mt-5 max-w-xl text-base text-foreground/70 md:text-lg">
            Streamnco analyse ta régularité, tes clips, ta catégorie et 4 autres signaux —
            puis te dit <span className="font-semibold text-foreground">exactement ce qui freine ta croissance</span> et quoi corriger en premier.
          </p>
        </div>

        <div
          className="mx-auto mt-8 max-w-lg text-left"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1) 200ms, transform 700ms cubic-bezier(0.16,1,0.3,1) 200ms",
          }}
        >
          {/* Platform selector */}
          <div className="mb-4 flex justify-center">
            <div className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-card/50 p-1 backdrop-blur-sm shadow-[0_2px_16px_hsl(var(--primary)/0.08)]">
              <div className="flex cursor-default select-none items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary shadow-[0_0_12px_hsl(var(--primary)/0.15)]">
                <span className="h-2 w-2 rounded-full bg-[#9146FF] shadow-[0_0_6px_#9146FF]" />
                Twitch
              </div>
              <div className="flex cursor-default select-none items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground/40" aria-disabled="true">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
                Kick
                <span className="rounded-full border border-border/40 bg-muted/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  Bientôt
                </span>
              </div>
            </div>
          </div>

          <HeroChannelSearch
            value={username}
            onChange={(next) => {
              setUsername(next);
              if (inputError) setInputError(null);
            }}
            onSubmit={(login, gameName) => handleAnalyze(login, gameName)}
            inputError={inputError}
          />

          {/* Trust signals — specific, objection-killing */}
          <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-foreground/65">
            {[
              { icon: ShieldCheck, label: "Sans connexion Twitch" },
              { icon: Timer, label: "Résultat en 45 secondes" },
              { icon: Activity, label: "Gratuit, sans carte bancaire" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-primary" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
