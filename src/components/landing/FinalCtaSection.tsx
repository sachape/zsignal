import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, TrendingUp, Sparkles } from "lucide-react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import HeroChannelSearch from "@/components/HeroChannelSearch";
import streamerImage from "@/assets/final-cta-streamer.jpg";

const FinalCtaSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const navigate = useNavigate();

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

  return (
    <section className="relative overflow-hidden py-28 md:py-36">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.16),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-40" />

      <div ref={ref} className="container relative mx-auto max-w-6xl px-4 md:px-6">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/40 backdrop-blur-xl shadow-[0_40px_120px_-40px_hsl(var(--primary)/0.35)]"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
            transition:
              "opacity 800ms cubic-bezier(0.16,1,0.3,1), transform 800ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Inner glow accents */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 right-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />

          <div className="relative grid gap-0 lg:grid-cols-[1.05fr_1fr]">
            {/* LEFT — Content + CTA */}
            <div className="flex flex-col justify-center p-8 sm:p-10 md:p-14 lg:p-16">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.25)]">
                <Clock className="h-3 w-3" />
                Diagnostic en moins de 60 secondes
              </span>

              <h2 className="mt-5 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl lg:text-[3.25rem] lg:leading-[1.05]">
                Ta prochaine palier de croissance commence maintenant.
              </h2>

              <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
                Entre ton nom de chaîne, reçois ton StreamScore, tes vrais
                concurrents et un plan d'action clair. Sans installation.
              </p>

              <div className="mt-8 max-w-lg">
                <HeroChannelSearch
                  value={username}
                  onChange={(next) => {
                    setUsername(next);
                    if (inputError) setInputError(null);
                  }}
                  onSubmit={(login) => handleAnalyze(login)}
                  inputError={inputError}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
                {[
                  "Gratuit",
                  "Sans compte",
                  "Données publiques uniquement",
                  "Résultat immédiat",
                ].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* RIGHT — Visual */}
            <div className="relative hidden min-h-[480px] overflow-hidden lg:block">
              {/* Vertical seam gradient blending into left column */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-card/80 to-transparent" aria-hidden />

              <img
                src={streamerImage}
                alt="Créateur Twitch concentré sur son setup en train d'analyser sa progression"
                width={1024}
                height={1280}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? "scale(1)" : "scale(1.05)",
                  transition:
                    "opacity 1200ms ease-out 200ms, transform 1400ms cubic-bezier(0.16,1,0.3,1) 200ms",
                }}
              />

              {/* Tonal overlay to harmonize with the dark theme */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-background/60 via-background/10 to-primary/10 mix-blend-multiply" aria-hidden />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.18),transparent_55%)]" aria-hidden />

              {/* Floating UI fragment — top */}
              <div
                className="pointer-events-none absolute right-6 top-8 z-20"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(16px)",
                  transition:
                    "opacity 800ms ease-out 700ms, transform 1000ms cubic-bezier(0.16,1,0.3,1) 700ms",
                }}
                aria-hidden
              >
                <div className="rounded-2xl border border-white/10 bg-card/70 px-3.5 py-2.5 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        StreamScore
                      </span>
                      <span className="text-xs font-semibold">
                        72 · +6 cette semaine
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating UI fragment — bottom */}
              <div
                className="pointer-events-none absolute bottom-8 left-6 z-20"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(16px)",
                  transition:
                    "opacity 800ms ease-out 900ms, transform 1000ms cubic-bezier(0.16,1,0.3,1) 900ms",
                }}
                aria-hidden
              >
                <div className="rounded-2xl border border-white/10 bg-card/70 px-3.5 py-2.5 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.3)]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Action prioritaire
                      </span>
                      <span className="text-xs font-semibold">
                        Stream mardi · 21h
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
