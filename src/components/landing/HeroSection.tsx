import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Clapperboard,
  Image as ImageIcon,
  Palette,
  Sparkles,
  Subtitles,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import HeroChannelSearch from "@/components/HeroChannelSearch";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";

const STREAM_DIMENSIONS = [
  { label: "Régularité", value: 78 },
  { label: "Clips", value: 64 },
  { label: "Catégorie", value: 52 },
  { label: "Momentum", value: 71 },
];

const QUEUE_ITEMS = [
  { type: "Clip", title: "Triple kill apex", status: "Prêt", tone: "primary" },
  { type: "Visuel", title: "Bannière event", status: "Brouillon", tone: "muted" },
  { type: "Clip", title: "Reaction stream", status: "Programmé", tone: "info" },
];

const HeroSection = () => {
  const [mounted, setMounted] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const primaryHref = user ? "/dashboard" : "/auth";
  const primaryLabel = user ? "Ouvrir le tableau de bord" : "Essayer gratuitement";

  const score = 72;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const fadeIn = (delay: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <section className="relative overflow-hidden pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-24 lg:pb-28">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.14),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)] opacity-50" />
      <div className="pointer-events-none absolute -left-32 top-1/3 hidden h-72 w-72 rounded-full bg-primary/15 blur-[120px] lg:block" />
      <div className="pointer-events-none absolute right-0 top-10 hidden h-80 w-80 rounded-full bg-primary/10 blur-[140px] lg:block" />

      <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          {/* ── Left: copy ─────────────────────────────────────── */}
          <div className="text-center lg:text-left">
            <div style={fadeIn(0)}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
                <Zap className="h-3 w-3" />
                Le cockpit créatif des streamers
              </span>

              <h1 className="mx-auto mt-5 max-w-3xl bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl md:text-6xl lg:mx-0 lg:text-[4rem] lg:leading-[1.05]">
                Crée tout le contenu autour de ton stream.
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-base text-foreground/70 md:text-lg lg:mx-0">
                Génère des <span className="font-semibold text-foreground">clips verticaux</span> avec facecam et sous-titres, crée tes <span className="font-semibold text-foreground">visuels Twitch et réseaux</span>, puis suis ta progression avec ton <span className="font-semibold text-foreground">StreamScore</span>.
              </p>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start" style={fadeIn(150)}>
              <Button asChild size="lg" className="group w-full sm:w-auto shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
                <Link to={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto bg-card/40 backdrop-blur-sm">
                <Link to="/fonctionnalites">Voir les fonctionnalités</Link>
              </Button>
            </div>

            {/* Secondary teaser entry */}
            <div className="mt-6" style={fadeIn(250)}>
              {!showSearch ? (
                <button
                  onClick={() => setShowSearch(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-foreground/65 transition-colors hover:text-foreground"
                >
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Ou diagnostique ta chaîne Twitch en 1 minute
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="mx-auto max-w-lg text-left lg:mx-0">
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
              )}
            </div>

            {/* Trust signals */}
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-foreground/65 lg:justify-start" style={fadeIn(350)}>
              {[
                "Sans carte bancaire",
                "Premier clip en moins de 2 min",
                "Annulable à tout moment",
              ].map((label) => (
                <li key={label} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Right: mockup composition ─────────────────────── */}
          <div className="relative hidden h-[520px] lg:block" style={fadeIn(400)}>
            <HeroMockup score={score} radius={radius} circumference={circumference} offset={offset} />
          </div>

          {/* Mobile mockup (simplified stack) */}
          <div className="relative mt-6 grid grid-cols-2 gap-3 lg:hidden" style={fadeIn(400)}>
            <MobileClipCard />
            <MobileScoreCard score={score} radius={radius} circumference={circumference} offset={offset} />
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────────── */
/* Desktop mockup composition                                          */
/* ─────────────────────────────────────────────────────────────────── */
const HeroMockup = ({
  score,
  radius,
  circumference,
  offset,
}: {
  score: number;
  radius: number;
  circumference: number;
  offset: number;
}) => (
  <div className="absolute inset-0">
    {/* StreamScore card — top right */}
    <div
      className="absolute right-0 top-0 w-[260px]"
      style={{ animation: "hero-float 7s ease-in-out infinite" }}
    >
      <div className="rounded-2xl border border-white/10 bg-card/80 p-4 backdrop-blur-xl shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.5)]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">StreamScore</span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-semibold text-primary">+6 cette semaine</span>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-20 w-20">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <defs>
                <linearGradient id="heroScore" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.4)" />
                </linearGradient>
              </defs>
              <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.3" strokeWidth="5" />
              <circle cx="40" cy="40" r={radius} fill="none" stroke="url(#heroScore)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold tabular-nums">{score}</span>
              <span className="text-[8px] text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            {STREAM_DIMENSIONS.map((d) => (
              <div key={d.label} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-foreground/70">{d.label}</span>
                  <span className="font-semibold tabular-nums text-foreground">{d.value}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/50"
                    style={{ width: `${d.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Vertical clip 9:16 — center-left */}
    <div
      className="absolute left-0 top-12 w-[180px]"
      style={{ animation: "hero-float 8s ease-in-out infinite 0.4s" }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[hsl(220_18%_18%)] to-[hsl(220_24%_8%)] shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.4)]">
        <div className="aspect-[9/16] relative">
          {/* Gameplay bottom */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(264_60%_30%)] via-[hsl(220_50%_20%)] to-[hsl(220_30%_10%)]" />
          {/* Facecam top */}
          <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden border-b border-white/10 bg-gradient-to-br from-[hsl(95_60%_35%)] to-[hsl(172_50%_30%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,hsl(0_0%_100%/0.15),transparent_60%)]" />
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-destructive/90 px-1.5 py-0.5 text-[8px] font-bold text-white">
              <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
              LIVE
            </div>
          </div>
          {/* Subtitle */}
          <div className="absolute inset-x-3 bottom-6 rounded-md bg-black/70 px-2 py-1 text-center text-[10px] font-bold leading-tight text-white shadow-lg backdrop-blur-sm">
            CE CLUTCH ÉTAIT IRRÉEL
          </div>
          {/* Tags */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            <span className="rounded-md bg-primary/90 px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">9:16</span>
            <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold text-white backdrop-blur-sm">Facecam</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 bg-card/80 px-2.5 py-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground">
            <Clapperboard className="h-3 w-3 text-primary" />
            Clip prêt
          </span>
          <span className="text-[9px] text-muted-foreground">00:42</span>
        </div>
      </div>
    </div>

    {/* Studio visuel — 3 stacked variants, bottom-right */}
    <div
      className="absolute bottom-4 right-6 w-[240px]"
      style={{ animation: "hero-float 9s ease-in-out infinite 0.8s" }}
    >
      <div className="rounded-2xl border border-white/10 bg-card/80 p-3 backdrop-blur-xl shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.4)]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
            <Palette className="h-3 w-3 text-primary" />
            Studio visuel
          </span>
          <span className="text-[9px] text-muted-foreground">3 variantes</span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {[
            "from-[hsl(264_60%_45%)] to-[hsl(220_70%_30%)]",
            "from-[hsl(95_60%_45%)] to-[hsl(172_60%_30%)]",
            "from-[hsl(0_60%_50%)] to-[hsl(38_80%_45%)]",
          ].map((grad, i) => (
            <div
              key={i}
              className={`aspect-square overflow-hidden rounded-lg bg-gradient-to-br ${grad} relative ring-1 ring-white/15`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(0_0%_100%/0.25),transparent_60%)]" />
              <div className="absolute bottom-1 left-1 right-1 rounded bg-black/40 px-1 text-center text-[7px] font-bold text-white backdrop-blur-sm">
                LIVE NOW
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {["Bannière", "Story", "Post"].map((f) => (
            <span key={f} className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-background/60 px-1.5 py-0.5 text-[8px] text-foreground/80">
              <ImageIcon className="h-2 w-2 text-primary/70" />
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>

    {/* Floating chips */}
    <div
      className="absolute left-[58%] top-[28%]"
      style={{ animation: "hero-float 6s ease-in-out infinite 1.2s" }}
    >
      <div className="rounded-full border border-white/10 bg-card/70 px-3 py-1.5 text-[10px] font-semibold text-foreground backdrop-blur-xl shadow-lg">
        <span className="inline-flex items-center gap-1.5">
          <Subtitles className="h-3 w-3 text-primary" />
          Sous-titres auto
        </span>
      </div>
    </div>
    <div
      className="absolute left-[50%] bottom-[36%]"
      style={{ animation: "hero-float 7.5s ease-in-out infinite 0.6s" }}
    >
      <div className="rounded-full border border-white/10 bg-card/70 px-3 py-1.5 text-[10px] font-semibold text-foreground backdrop-blur-xl shadow-lg">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          3 variantes IA
        </span>
      </div>
    </div>

    {/* Mini content queue — bottom left */}
    <div
      className="absolute bottom-0 left-2 w-[200px]"
      style={{ animation: "hero-float 8.5s ease-in-out infinite 0.2s" }}
    >
      <div className="rounded-2xl border border-white/10 bg-card/80 p-3 backdrop-blur-xl shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.3)]">
        <span className="text-[10px] font-semibold text-foreground">File de contenu</span>
        <div className="mt-2 space-y-1.5">
          {QUEUE_ITEMS.map((item) => (
            <div key={item.title} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-background/40 px-2 py-1.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.tone === "primary" ? "bg-primary" : item.tone === "info" ? "bg-info" : "bg-muted-foreground/50"}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-semibold text-foreground">{item.title}</div>
                <div className="text-[8px] text-muted-foreground">{item.type} · {item.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* Mobile simplified mockups */
const MobileClipCard = () => (
  <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/70 shadow-xl backdrop-blur-xl">
    <div className="aspect-[9/16] relative">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(264_60%_30%)] to-[hsl(220_30%_10%)]" />
      <div className="absolute inset-x-0 top-0 h-1/2 border-b border-white/10 bg-gradient-to-br from-[hsl(95_60%_35%)] to-[hsl(172_50%_30%)]" />
      <div className="absolute inset-x-2 bottom-4 rounded bg-black/70 px-1.5 py-1 text-center text-[9px] font-bold text-white">
        SOUS-TITRES AUTO
      </div>
      <span className="absolute left-2 top-2 rounded-md bg-primary/90 px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">9:16</span>
    </div>
    <div className="border-t border-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-foreground">Clip prêt</div>
  </div>
);

const MobileScoreCard = ({
  score,
  radius,
  circumference,
  offset,
}: {
  score: number;
  radius: number;
  circumference: number;
  offset: number;
}) => (
  <div className="flex flex-col rounded-2xl border border-white/10 bg-card/70 p-3 shadow-xl backdrop-blur-xl">
    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">StreamScore</span>
    <div className="relative mx-auto mt-3 h-24 w-24">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.3" strokeWidth="6" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{score}</span>
      </div>
    </div>
    <span className="mt-2 text-center text-[10px] text-muted-foreground">Diagnostic instantané</span>
  </div>
);

export default HeroSection;
