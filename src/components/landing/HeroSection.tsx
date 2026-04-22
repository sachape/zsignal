import { useEffect, useState } from "react";
import { ArrowRight, Zap, TrendingUp, Users, Target, Activity, Sparkles, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import HeroChannelSearch from "@/components/HeroChannelSearch";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";

const HeroSection = () => {
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleAnalyze = (explicitLogin?: string) => {
    const login =
      explicitLogin?.trim().toLowerCase() || normalizeChannelInput(username);
    if (!login) {
      setInputError(
        "Entre un nom d'utilisateur Twitch valide ou une URL twitch.tv/...",
      );
      return;
    }
    setInputError(null);
    navigate(`/analyze?channel=${encodeURIComponent(login)}&mode=teaser`);
  };

  // Animated mini StreamScore ring (decorative)
  const ringScore = 78;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (ringScore / 100) * circumference;

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Layered atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)] opacity-50" />

      {/* ===== Floating UI illustrations (decorative) ===== */}

      {/* RIGHT — StreamScore ring card */}
      <div
        className="pointer-events-none absolute right-[3%] top-[18%] hidden lg:block"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0) rotate(3deg)" : "translateY(30px) rotate(3deg)",
          transition: "opacity 1000ms ease-out 500ms, transform 1200ms cubic-bezier(0.16,1,0.3,1) 500ms",
          animation: mounted ? "bento-float 6s ease-in-out infinite" : undefined,
        }}
        aria-hidden
      >
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
              <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">StreamScore</span>
              <span className="text-sm font-semibold">Bon rythme</span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-primary">
                <TrendingUp className="h-2.5 w-2.5" /> +6 cette semaine
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Mini sparkline / viewers card */}
      <div
        className="pointer-events-none absolute right-[8%] top-[55%] hidden lg:block"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0) rotate(-4deg)" : "translateY(40px) rotate(-4deg)",
          transition: "opacity 1000ms ease-out 750ms, transform 1200ms cubic-bezier(0.16,1,0.3,1) 750ms",
          animation: mounted ? "bento-float 7s ease-in-out infinite 1s" : undefined,
        }}
        aria-hidden
      >
        <div className="relative w-[200px] rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.3)]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Viewers moy.</span>
            <Activity className="h-3 w-3 text-primary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums">42</span>
            <span className="text-[10px] text-primary">+12%</span>
          </div>
          <svg viewBox="0 0 120 30" className="mt-2 h-8 w-full">
            <defs>
              <linearGradient id="heroSparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,22 L15,18 L30,20 L45,14 L60,16 L75,10 L90,12 L105,6 L120,8 L120,30 L0,30 Z" fill="url(#heroSparkGrad)" />
            <path d="M0,22 L15,18 L30,20 L45,14 L60,16 L75,10 L90,12 L105,6 L120,8" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* RIGHT — Affiliation goal card (xl only) */}
      <div
        className="pointer-events-none absolute right-[14%] top-[82%] hidden xl:block"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0) rotate(2deg)" : "translateY(30px) rotate(2deg)",
          transition: "opacity 1000ms ease-out 950ms, transform 1200ms cubic-bezier(0.16,1,0.3,1) 950ms",
          animation: mounted ? "bento-float 8s ease-in-out infinite 0.5s" : undefined,
        }}
        aria-hidden
      >
        <div className="relative w-[180px] rounded-2xl border border-white/10 bg-card/60 p-3.5 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.3)]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
              <Trophy className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Objectif</span>
              <span className="text-xs font-semibold">Affiliation</span>
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">6/7 jours</span>
              <span className="font-semibold tabular-nums text-primary">86%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60" style={{ width: "86%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* LEFT — Insight pill card */}
      <div
        className="pointer-events-none absolute left-[4%] top-[28%] hidden lg:block"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0) rotate(-3deg)" : "translateY(30px) rotate(-3deg)",
          transition: "opacity 1000ms ease-out 650ms, transform 1200ms cubic-bezier(0.16,1,0.3,1) 650ms",
          animation: mounted ? "bento-float 7.5s ease-in-out infinite 0.3s" : undefined,
        }}
        aria-hidden
      >
        <div className="relative rounded-2xl border border-white/10 bg-card/60 px-3.5 py-3 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.3)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Meilleur créneau</span>
              <span className="text-xs font-semibold">Mardi · 21h</span>
            </div>
          </div>
        </div>
      </div>

      {/* LEFT — Competitor card (xl only) */}
      <div
        className="pointer-events-none absolute left-[7%] top-[64%] hidden xl:block"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0) rotate(4deg)" : "translateY(40px) rotate(4deg)",
          transition: "opacity 1000ms ease-out 850ms, transform 1200ms cubic-bezier(0.16,1,0.3,1) 850ms",
          animation: mounted ? "bento-float 8s ease-in-out infinite 1.2s" : undefined,
        }}
        aria-hidden
      >
        <div className="relative w-[190px] rounded-2xl border border-white/10 bg-card/60 p-3.5 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.3)]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Similaire</span>
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">87%</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-primary/10 text-[10px] font-bold">
              SZ
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold">streamzill…</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Users className="h-2.5 w-2.5" /> 2,4K abonnés
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Soft ambient glows behind clusters */}
      <div className="pointer-events-none absolute right-[6%] top-[40%] hidden h-40 w-40 rounded-full bg-primary/15 blur-3xl lg:block" aria-hidden />
      <div className="pointer-events-none absolute left-[6%] top-[50%] hidden h-32 w-32 rounded-full bg-primary/10 blur-3xl lg:block" aria-hidden />
      <div className="pointer-events-none absolute right-[-10%] top-[20%] h-48 w-48 rounded-full bg-primary/10 blur-3xl lg:hidden" aria-hidden />

      <div className="container relative mx-auto max-w-6xl px-4 text-center md:px-6">
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
            <Zap className="h-3 w-3" />
            Copilote de croissance streamer
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl md:text-7xl">
            Analyse ta chaîne Twitch et débloque ta croissance
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Ton StreamScore, tes concurrents pertinents et un plan d'action clair.
            Sans compte, en moins de 60 secondes.
          </p>
        </div>

        <div
          className="mx-auto mt-10 max-w-lg text-left"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1) 200ms, transform 700ms cubic-bezier(0.16,1,0.3,1) 200ms",
          }}
        >
          <HeroChannelSearch
            value={username}
            onChange={(next) => {
              setUsername(next);
              if (inputError) setInputError(null);
            }}
            onSubmit={(login) => handleAnalyze(login)}
            inputError={inputError}
          />
          <div className="mt-3 flex flex-col items-center gap-1 text-center">
            <p className="text-xs text-muted-foreground">
              Aperçu gratuit · pas de compte requis pour la première analyse
            </p>
            <Button
              variant="link"
              onClick={() =>
                openAuthModal({
                  redirectTo: "/dashboard",
                  pendingChannel: normalizeChannelInput(username) || undefined,
                })
              }
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Déjà un compte ? Se connecter
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Trust strip */}
        <div
          className="mx-auto mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 800ms ease-out 500ms",
          }}
        >
          {["Lecture seule", "Aucune publication", "Données publiques uniquement"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
