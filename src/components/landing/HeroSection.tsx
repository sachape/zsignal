import { useEffect, useState } from "react";
import { ArrowRight, Zap } from "lucide-react";
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

      {/* Floating decorative ring (desktop only) */}
      <div
        className="pointer-events-none absolute right-[8%] top-[28%] hidden lg:block"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 1200ms ease-out 600ms, transform 1200ms ease-out 600ms",
        }}
        aria-hidden
      >
        <div className="relative h-24 w-24 animate-[bento-rotate_20s_linear_infinite] rounded-full">
          <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id="heroRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--primary) / 0.4)" />
              </linearGradient>
            </defs>
            <circle cx="30" cy="30" r={radius} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.3" strokeWidth="3" />
            <circle
              cx="30"
              cy="30"
              r={radius}
              fill="none"
              stroke="url(#heroRingGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
        </div>
      </div>
      <div
        className="pointer-events-none absolute left-[6%] top-[40%] hidden lg:block"
        style={{
          opacity: mounted ? 0.7 : 0,
          transition: "opacity 1400ms ease-out 800ms",
        }}
        aria-hidden
      >
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-xl" />
      </div>

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
