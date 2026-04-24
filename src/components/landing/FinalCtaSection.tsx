import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp } from "lucide-react";
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
    <section className="relative overflow-hidden py-20 md:py-24">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.14),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-40" />

      <div ref={ref} className="container relative mx-auto max-w-5xl px-4 md:px-6">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/40 backdrop-blur-xl shadow-[0_40px_120px_-40px_hsl(var(--primary)/0.35)]"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
            transition:
              "opacity 800ms cubic-bezier(0.16,1,0.3,1), transform 800ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 right-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />

          <div className="relative grid gap-0 lg:grid-cols-[1.15fr_1fr]">
            {/* LEFT — Content + CTA (the real conversion zone) */}
            <div className="flex flex-col justify-center p-8 sm:p-10 md:p-12 lg:p-14">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.25)]">
                <Sparkles className="h-3 w-3" />
                Prêt à voir ce qui bloque ?
              </span>

              <h2 className="mt-5 bg-gradient-to-b from-foreground to-foreground/65 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl lg:text-[2.75rem] lg:leading-[1.05]">
                Tu n'as plus à deviner.
              </h2>

              <p className="mt-4 max-w-md text-sm text-muted-foreground md:text-base">
                Lance ton diagnostic gratuit. Si tu veux ensuite suivre ta
                progression dans le temps, le suivi complet prend le relais.
              </p>

              <div className="mt-7 max-w-md">
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

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground/90">
                {[
                  "Aucune connexion Twitch requise",
                  "Lecture seule",
                  "Sans compte",
                ].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* RIGHT — Subtle supporting visual (does not compete with the CTA) */}
            <div className="relative hidden min-h-[400px] overflow-hidden lg:block">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-card/85 to-transparent" aria-hidden />

              <img
                src={streamerImage}
                alt=""
                width={1024}
                height={1280}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  opacity: inView ? 0.85 : 0,
                  transform: inView ? "scale(1)" : "scale(1.05)",
                  transition:
                    "opacity 1200ms ease-out 200ms, transform 1400ms cubic-bezier(0.16,1,0.3,1) 200ms",
                }}
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-background/70 via-background/20 to-primary/10 mix-blend-multiply" aria-hidden />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.18),transparent_55%)]" aria-hidden />

              {/* Two minimal supporting chips — no competing CTA */}
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
                <div className="rounded-2xl border border-white/10 bg-card/75 px-3.5 py-2.5 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        StreamScore
                      </span>
                      <span className="text-xs font-semibold">62 / 100</span>
                    </div>
                  </div>
                </div>
              </div>

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
                <div className="rounded-2xl border border-white/10 bg-card/75 px-3.5 py-2.5 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.3)]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Action prioritaire
                      </span>
                      <span className="text-xs font-semibold">
                        Fixer 2 créneaux
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
