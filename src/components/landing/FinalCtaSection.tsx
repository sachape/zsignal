import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Clapperboard, Palette, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import HeroChannelSearch from "@/components/HeroChannelSearch";
import { SectionShell, SectionBadge, GlassCard } from "./primitives";
import { Reveal, Stagger, StaggerItem } from "./motion";

const FEATURES = [
  { icon: Clapperboard, label: "Clipping", copy: "Vertical 9:16, facecam, sous-titres." },
  { icon: Palette, label: "Studio visuel", copy: "Formats Twitch et social prêts." },
  { icon: Search, label: "Diagnostic Twitch", copy: "Score, benchmark, recommandations." },
];

const FinalCtaSection = () => {
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
    <SectionShell tone="deep" className="py-20 md:py-24">
      <Reveal className="mx-auto max-w-5xl">
        <GlassCard hero>
          {/* Top hairline glow — premium edge light */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="grid gap-px bg-white/[0.055] lg:grid-cols-[1.05fr_0.95fr]">
            {/* Left — message + primary CTA */}
            <div className="bg-card/80 p-7 backdrop-blur-xl sm:p-9 md:p-12">
              <SectionBadge>
                <Sparkles className="h-3 w-3" /> Démarrer
              </SectionBadge>

              <h2 className="mt-5 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl lg:text-[2.8rem] lg:leading-[1.04]">
                Ouvre un espace plus propre pour ton stream.
              </h2>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
                Crée tes premiers clips, prépare tes visuels, range tes contenus et garde un œil
                sur ta progression Twitch depuis le même cockpit.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="group relative gap-2 overflow-hidden shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)]"
                  onClick={() => openAuthModal("signup")}
                >
                  <span
                    className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 bg-white/25 blur-md transition-[transform] duration-700 group-hover:translate-x-[420%]"
                    aria-hidden
                  />
                  Essayer gratuitement
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/pricing">Voir les tarifs</Link>
                </Button>
              </div>
            </div>

            {/* Right — proof tiles + public diagnostic */}
            <div className="bg-card/80 p-7 backdrop-blur-xl sm:p-9 md:p-12">
              <Stagger className="grid gap-3 sm:grid-cols-2" stagger={0.08} amount={0.4}>
                {FEATURES.map(({ icon: Icon, label, copy }) => (
                  <StaggerItem
                    key={label}
                    y={14}
                    className="group rounded-xl border border-white/[0.07] bg-white/[0.035] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white/[0.06] sm:last:col-span-2"
                  >
                    <Icon className="h-4 w-4 text-primary transition-transform duration-300 group-hover:scale-110" />
                    <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy}</p>
                  </StaggerItem>
                ))}
              </Stagger>

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
        </GlassCard>
      </Reveal>
    </SectionShell>
  );
};

export default FinalCtaSection;
