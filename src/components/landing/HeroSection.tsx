import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Download,
  ListChecks,
  Palette,
  ShieldCheck,
  Sparkles,
  Timer,
  Type,
  Upload,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import HeroChannelSearch from "@/components/HeroChannelSearch";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";

const PRODUCT_FLOW = [
  { label: "Clip Twitch", value: "URL, VOD ou upload", icon: Upload },
  { label: "Montage 9:16", value: "Facecam + gameplay", icon: Clapperboard },
  { label: "Sous-titres", value: "Styles prêts à poster", icon: Type },
  { label: "Export", value: "Téléchargement manuel", icon: Download },
] as const;

const HeroSection = () => {
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { openAuthModal } = useAuthModal();
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

  return (
    <section className="relative overflow-hidden pt-28 pb-14 sm:pt-32 md:pt-36 md:pb-20">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,hsl(var(--background))_0%,#11161c_42%,#0a0d10_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(ellipse_at_20%_10%,rgba(190,255,90,0.18),transparent_42%),radial-gradient(ellipse_at_78%_18%,rgba(90,210,255,0.12),transparent_38%),radial-gradient(ellipse_at_52%_92%,rgba(255,183,77,0.08),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)] opacity-30" />

      <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-[0.96fr_1.04fr] lg:items-center">
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Cockpit créatif pour streamers
            </span>

            <h1 className="font-display mt-6 max-w-4xl text-5xl font-bold leading-[0.95] tracking-tight text-foreground sm:text-6xl md:text-7xl">
              Crée, organise et améliore tout ton contenu de stream.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground md:text-lg">
              Streamnco transforme tes clips, prépare tes visuels, centralise tes contenus et t'aide à comprendre quoi améliorer sur Twitch. Un atelier premium, pensé pour publier plus proprement sans promettre de magie.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gap-2" onClick={() => openAuthModal("signup")}>
                Essayer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/fonctionnalites">Voir les fonctionnalités</Link>
              </Button>
            </div>

            <div className="mt-7 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              {[
                "Clips 9:16 prêts à télécharger",
                "Visuels aux bonnes dimensions",
                "Réseaux connectés marqués Bientôt",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div
              className="mt-8 max-w-xl rounded-xl border border-white/[0.08] bg-black/20 p-3 shadow-[0_24px_80px_-54px_rgba(190,255,90,0.55)] backdrop-blur-xl"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(18px)",
                transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1) 180ms, transform 700ms cubic-bezier(0.16,1,0.3,1) 180ms",
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                    Entrée rapide
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    Teste le diagnostic Twitch public
                  </p>
                </div>
                <span className="hidden rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                  Sans connexion Twitch
                </span>
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
              <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-[11px] text-muted-foreground">
                {[
                  { icon: ShieldCheck, label: "Lecture seule" },
                  { icon: Timer, label: "Premier aperçu en 60 s" },
                  { icon: Activity, label: "StreamScore + recommandations" },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="inline-flex items-center gap-1.5">
                    <Icon className="h-3 w-3 text-primary" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="relative"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0) rotate(0deg)" : "translateY(24px) rotate(0.6deg)",
              transition: "opacity 900ms cubic-bezier(0.16,1,0.3,1) 240ms, transform 900ms cubic-bezier(0.16,1,0.3,1) 240ms",
            }}
          >
            <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-primary/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1014]/[0.88] shadow-[0_30px_120px_-70px_rgba(190,255,90,0.55)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Streamnco Studio
                </p>
              </div>

              <div className="grid gap-px bg-white/[0.055] lg:grid-cols-[0.72fr_1fr]">
                <div className="bg-[#0c1014] p-5">
                  <div className="mx-auto aspect-[9/16] max-w-[220px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#121820]">
                    <div className="relative h-full">
                      <div className="absolute inset-x-0 top-0 h-[42%] bg-[linear-gradient(135deg,#232b35,#0e141b)]">
                        <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-white/[0.08] bg-black/35 p-2 backdrop-blur">
                          <p className="text-[9px] uppercase tracking-[0.16em] text-primary">Facecam détectée</p>
                          <div className="mt-2 h-12 rounded-md bg-[linear-gradient(135deg,rgba(190,255,90,0.24),rgba(255,255,255,0.04))]" />
                        </div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(160deg,#1a2218,#090c0d)]">
                        <div className="absolute left-4 top-6 h-16 w-24 rounded-lg border border-primary/20 bg-primary/10" />
                        <div className="absolute bottom-14 left-5 right-5 rounded-md bg-black/75 px-3 py-2 text-center text-[13px] font-black uppercase leading-tight text-white">
                          le clutch qui change tout
                        </div>
                        <div className="absolute bottom-5 left-5 right-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-[72%] rounded-full bg-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Clip vertical, sous-titres incrustés, prêt à télécharger.
                  </p>
                </div>

                <div className="bg-[#0c1014] p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PRODUCT_FLOW.map(({ label, value, icon: Icon }, index) => (
                      <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
                        <div className="flex items-center justify-between">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground">0{index + 1}</span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-cyan-300/[0.15] bg-cyan-300/[0.06] p-4">
                      <div className="flex items-center gap-2 text-cyan-100">
                        <Palette className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-[0.16em]">Studio visuel</span>
                      </div>
                      <p className="mt-3 text-2xl font-bold text-foreground">8 formats</p>
                      <p className="mt-1 text-xs text-muted-foreground">3 variantes par génération, export aux bonnes dimensions.</p>
                    </div>
                    <div className="rounded-xl border border-amber-300/[0.15] bg-amber-300/[0.06] p-4">
                      <div className="flex items-center gap-2 text-amber-100">
                        <ListChecks className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-[0.16em]">File de contenu</span>
                      </div>
                      <p className="mt-3 text-2xl font-bold text-foreground">Brouillons</p>
                      <p className="mt-1 text-xs text-muted-foreground">Clips et visuels préparés avant publication manuelle.</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">StreamScore</p>
                        <p className="mt-1 text-sm text-muted-foreground">Score global, dimensions et recommandations.</p>
                      </div>
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-2xl font-bold text-foreground">
                        73
                      </div>
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

export default HeroSection;
