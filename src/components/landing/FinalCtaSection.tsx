import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import HeroChannelSearch from "@/components/HeroChannelSearch";

const FinalCtaSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAnalyze = (explicitLogin?: string, gameNameHint?: string | null) => {
    const login =
      explicitLogin?.trim().toLowerCase() || normalizeChannelInput(username);
    if (!login) {
      setInputError("Entre un nom d'utilisateur Twitch valide ou une URL twitch.tv/...");
      return;
    }
    setInputError(null);
    const hint = gameNameHint ? `&hint_game=${encodeURIComponent(gameNameHint)}` : "";
    navigate(`/analyze?channel=${encodeURIComponent(login)}&mode=teaser${hint}`);
  };

  return (
    <section className="relative overflow-hidden bg-foreground py-20 md:py-28">
      {/* Pixel decoration */}
      <span className="pointer-events-none absolute right-12 top-10 text-4xl text-primary opacity-40 select-none" aria-hidden>✦</span>
      <span className="pointer-events-none absolute left-8 bottom-12 text-3xl opacity-30 select-none" style={{ color: "hsl(25 88% 55%)" }} aria-hidden>★</span>
      <span className="pointer-events-none absolute right-[30%] bottom-8 text-2xl text-primary opacity-25 select-none" aria-hidden>⚡</span>

      <div ref={ref} className="container relative mx-auto max-w-6xl px-4 md:px-6">
        <div
          className="grid items-center gap-10 lg:grid-cols-[1fr_380px]"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 800ms cubic-bezier(0.16,1,0.3,1), transform 800ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Left — CTA */}
          <div>
            {/* Badge */}
            <div className="mb-5 inline-block">
              <div className="relative rounded-xl border-2 border-primary bg-primary/20 px-4 py-2 font-display text-sm font-bold text-primary">
                ⚡ Diagnostic gratuit · Résultat en 60 s
                <span className="absolute -bottom-2 left-6 block h-3 w-3 rotate-45 bg-primary/20 border-b-2 border-r-2 border-primary" aria-hidden />
              </div>
            </div>

            <h2 className="font-display text-4xl font-bold leading-tight text-background md:text-5xl lg:text-6xl">
              Clutch time.<br />
              <span className="text-primary">Lance le diagnostic.</span>
            </h2>

            <p className="mt-4 max-w-lg text-base text-background/70">
              Entre ton pseudo Twitch. En 60 secondes tu as ton score, ton blocage principal, et ton premier plan d'action.{" "}
              <strong className="font-semibold text-background">Gratuit, sans compte.</strong>
            </p>

            <div className="mt-7 max-w-lg">
              <HeroChannelSearch
                value={username}
                onChange={(next) => {
                  setUsername(next);
                  if (inputError) setInputError(null);
                }}
                onSubmit={(login, gameName) => handleAnalyze(login, gameName)}
                inputError={inputError}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-background/55">
              {["Aucune connexion Twitch requise", "Lecture seule", "Sans compte"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — illustration */}
          <div
            className="hidden lg:flex lg:items-center lg:justify-center"
            style={{
              opacity: inView ? 1 : 0,
              transition: "opacity 1000ms ease-out 300ms",
            }}
          >
            <img
              src="/illustrations/boss-fight.png"
              alt=""
              aria-hidden
              loading="lazy"
              className="w-full max-w-sm drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
