import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Clapperboard, Palette, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import HeroChannelSearch from "@/components/HeroChannelSearch";

const FinalCtaSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

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

  return (
    <section className="relative overflow-hidden py-20 md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(190,255,90,0.14),transparent_62%)]" />
      <div ref={ref} className="container relative mx-auto max-w-5xl px-4 md:px-6">
        <div
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1116]/90 backdrop-blur-xl"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
            transition:
              "opacity 800ms cubic-bezier(0.16,1,0.3,1), transform 800ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="grid gap-px bg-white/[0.055] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-[#0d1116] p-7 sm:p-9 md:p-12">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-3 w-3" />
                Démarrer
              </span>

              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-[2.8rem] lg:leading-[1.04]">
                Ouvre un espace plus propre pour ton stream.
              </h2>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
                Crée tes premiers clips, prépare tes visuels, range tes contenus et garde un oeil sur ta progression Twitch depuis le même cockpit.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="gap-2" onClick={() => openAuthModal("signup")}>
                  Essayer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/pricing">Voir les tarifs</Link>
                </Button>
              </div>
            </div>

            <div className="bg-[#0d1116] p-7 sm:p-9 md:p-12">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Clapperboard, label: "Clips réseaux", copy: "Vertical 9:16, facecam, sous-titres." },
                  { icon: Palette, label: "Studio visuel", copy: "Formats Twitch et social prêts." },
                  { icon: Search, label: "Diagnostic Twitch", copy: "Score, benchmark, recommandations." },
                ].map(({ icon: Icon, label, copy }) => (
                  <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-4 sm:last:col-span-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/20 p-3">
                <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Ou tester le diagnostic public
                </p>
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
