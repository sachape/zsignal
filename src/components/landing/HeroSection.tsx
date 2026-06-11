import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clapperboard,
  Image as ImageIcon,
  Palette,
  Sparkles,
  Subtitles,
  Zap,
  CheckCircle2,
  TrendingUp,
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
    <section className="relative overflow-hidden pt-24 pb-14 sm:pt-28 sm:pb-20 md:pt-32 md:pb-28">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.035)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] opacity-50" />
      <div className="pointer-events-none absolute -left-32 top-1/3 hidden h-72 w-72 rounded-full bg-primary/15 blur-[120px] lg:block" />
      <div className="pointer-events-none absolute right-0 top-10 hidden h-80 w-80 rounded-full bg-primary/10 blur-[140px] lg:block" />

      <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          {/* ── Left: copy + diagnostic ────────────────────────── */}
          <div className="text-center lg:text-left">
            <div style={fadeIn(0)}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
                <Zap className="h-3 w-3" />
                Le cockpit créatif des streamers
              </span>

              <h1 className="mt-6 max-w-3xl bg-gradient-to-b from-foreground to-foreground/55 bg-clip-text text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-transparent sm:text-[52px] md:text-[64px] lg:text-[68px]">
                Crée tout le contenu autour de ton stream.
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-foreground/65 sm:text-base md:text-lg">
                Clips verticaux avec facecam et sous-titres, visuels Twitch et réseaux sociaux, et un StreamScore pour comprendre quoi améliorer — depuis un seul cockpit.
              </p>
            </div>

            {/* Primary actions */}
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start" style={fadeIn(120)}>
              <Button asChild size="lg" className="group shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
                <Link to={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-foreground/75 hover:text-foreground hover:bg-white/[0.04]">
                <Link to="/fonctionnalites">
                  Voir les fonctionnalités
                </Link>
              </Button>
            </div>

            {/* Diagnostic — visible & prominent */}
            <div className="mt-8" style={fadeIn(220)}>
              <div className="rounded-2xl border border-primary/15 bg-card/40 p-4 backdrop-blur-sm sm:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-foreground">Diagnostique ta chaîne — gratuit, sans inscription</div>
                    <div className="text-[11px] text-muted-foreground">Ton StreamScore en moins d'une minute</div>
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
              </div>
            </div>

            {/* Trust signals */}
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-foreground/65 lg:justify-start" style={fadeIn(320)}>
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
          <div className="relative hidden h-[560px] lg:block" style={fadeIn(400)}>
            <HeroMockup score={score} radius={radius} circumference={circumference} offset={offset} />
          </div>

          {/* Mobile simplified mockup */}
          <div className="relative mt-4 grid grid-cols-2 gap-3 lg:hidden" style={fadeIn(400)}>
            <MobileClipCard />
            <MobileScoreCard score={score} radius={radius} circumference={circumference} offset={offset} />
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────────── */
/* Desktop mockup composition — refined realism                         */
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
    <div className="absolute right-0 top-2 w-[280px]" style={{ animation: "hero-float 7s ease-in-out infinite" }}>
      <div className="rounded-2xl border border-white/[0.08] bg-[hsl(220_20%_8%)]/95 p-4 backdrop-blur-xl shadow-[0_40px_100px_-30px_hsl(var(--primary)/0.4),0_0_0_1px_hsl(var(--foreground)/0.02)_inset]">
        {/* mini window chrome */}
        <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[9px] font-medium text-muted-foreground">streamnco.com / streamscore</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">StreamScore</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[9px] font-semibold text-primary">
            <TrendingUp className="h-2.5 w-2.5" />
            +6 cette semaine
          </span>
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
              <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.25" strokeWidth="5" />
              <circle cx="40" cy="40" r={radius} fill="none" stroke="url(#heroScore)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold tabular-nums">{score}</span>
              <span className="text-[8px] text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            {STREAM_DIMENSIONS.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-foreground/70">{d.label}</span>
                  <span className="font-semibold tabular-nums text-foreground">{d.value}</span>
                </div>
                <div className="mt-0.5 h-[3px] overflow-hidden rounded-full bg-muted/40">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/40" style={{ width: `${d.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-primary/15 bg-primary/[0.06] px-2.5 py-2">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-primary">Recommandé</div>
          <div className="mt-0.5 text-[11px] font-medium leading-snug text-foreground">Stabilise 2 créneaux récurrents par semaine</div>
        </div>
      </div>
    </div>

    {/* Vertical clip 9:16 — center-left, refined */}
    <div className="absolute left-0 top-16 w-[195px]" style={{ animation: "hero-float 8s ease-in-out infinite 0.4s" }}>
      <div className="relative overflow-hidden rounded-[20px] border border-white/[0.08] shadow-[0_40px_100px_-30px_hsl(var(--primary)/0.4)]">
        <div className="relative aspect-[9/16]">
          {/* Gameplay (bottom half) — minimal mesh */}
          <div className="absolute inset-x-0 bottom-0 top-1/2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(264_45%_22%)] via-[hsl(220_40%_14%)] to-[hsl(220_30%_8%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_60%,hsl(264_70%_50%/0.35),transparent_55%)]" />
            {/* HUD elements */}
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5 text-[7px] font-bold text-white backdrop-blur-sm ring-1 ring-white/10">
              <span className="h-1 w-1 rounded-full bg-success" />
              92 HP
            </div>
            <div className="absolute right-2 top-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[7px] font-bold text-white backdrop-blur-sm ring-1 ring-white/10">
              03:24
            </div>
          </div>
          {/* Facecam (top half) — soft portrait */}
          <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden border-b border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(40_70%_55%)] via-[hsl(20_60%_40%)] to-[hsl(220_30%_15%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,hsl(40_60%_70%/0.4),transparent_60%)]" />
            {/* Camera frame */}
            <div className="absolute inset-2 rounded-md ring-1 ring-white/15" />
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-destructive/95 px-1.5 py-0.5 text-[7px] font-bold text-white shadow-lg">
              <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
              LIVE
            </div>
            <div className="absolute left-2 bottom-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[8px] font-semibold text-white backdrop-blur-sm">
              @streamer
            </div>
          </div>
          {/* Subtitle styled like Reels/TikTok captions */}
          <div className="absolute inset-x-2 bottom-8 flex justify-center">
            <span className="rounded-md bg-black/85 px-2 py-1 text-center text-[10px] font-extrabold uppercase leading-tight tracking-wide text-white shadow-lg ring-1 ring-white/10">
              CE CLUTCH ÉTAIT
              <br />
              <span className="text-primary">IRRÉEL</span>
            </span>
          </div>
          {/* Progress bar */}
          <div className="absolute inset-x-3 bottom-3 h-0.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-1/3 rounded-full bg-white" />
          </div>
          {/* Top tag */}
          <div className="absolute left-2 top-12 rounded-md bg-primary/95 px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground shadow">9:16</div>
        </div>
        {/* Status bar */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[hsl(220_20%_8%)]/95 px-2.5 py-2 backdrop-blur">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground">
            <Clapperboard className="h-3 w-3 text-primary" />
            Clip prêt
          </span>
          <span className="text-[9px] tabular-nums text-muted-foreground">00:42</span>
        </div>
      </div>
    </div>

    {/* Studio visuel — 3 variants card, bottom-right, refined */}
    <div className="absolute bottom-2 right-8 w-[256px]" style={{ animation: "hero-float 9s ease-in-out infinite 0.8s" }}>
      <div className="rounded-2xl border border-white/[0.08] bg-[hsl(220_20%_8%)]/95 p-3.5 backdrop-blur-xl shadow-[0_40px_100px_-30px_hsl(var(--primary)/0.4)]">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
            <Palette className="h-3 w-3 text-primary" />
            Studio visuel · Annonce live
          </span>
          <span className="text-[9px] text-muted-foreground">3 variantes</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {/* Variant 1 — bold dark */}
          <div className="aspect-square overflow-hidden rounded-md ring-1 ring-white/10 relative bg-gradient-to-br from-[hsl(264_55%_35%)] via-[hsl(220_50%_22%)] to-[hsl(220_30%_10%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,hsl(264_80%_60%/0.4),transparent_55%)]" />
            <div className="absolute left-1 top-1 right-1 flex items-center justify-between">
              <span className="text-[6px] font-bold uppercase text-white/80 tracking-widest">STREAMER</span>
              <span className="h-1 w-1 rounded-full bg-destructive" />
            </div>
            <div className="absolute bottom-1 left-1 text-[8px] font-extrabold uppercase text-white leading-none">LIVE<br /><span className="text-[6px] text-white/70 font-semibold">CE SOIR · 21H</span></div>
          </div>
          {/* Variant 2 — neon glow */}
          <div className="aspect-square overflow-hidden rounded-md ring-1 ring-white/10 relative bg-gradient-to-br from-[hsl(95_60%_30%)] via-[hsl(172_60%_25%)] to-[hsl(220_30%_8%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(95_80%_55%/0.5),transparent_55%)]" />
            <div className="absolute inset-x-1 top-1 text-[6px] font-bold uppercase text-primary tracking-widest">ON STREAM</div>
            <div className="absolute bottom-1 left-1 right-1">
              <div className="text-[8px] font-extrabold uppercase text-white leading-tight">SOLO RANKED<br /><span className="text-[6px] text-white/70 font-semibold">VENONS GRIMPER</span></div>
            </div>
          </div>
          {/* Variant 3 — sunset warm */}
          <div className="aspect-square overflow-hidden rounded-md ring-1 ring-white/10 relative bg-gradient-to-br from-[hsl(20_75%_50%)] via-[hsl(0_60%_45%)] to-[hsl(264_30%_20%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,hsl(38_90%_60%/0.45),transparent_55%)]" />
            <div className="absolute left-1 top-1 text-[6px] font-bold uppercase tracking-widest text-white/90">EVENT</div>
            <div className="absolute bottom-1 left-1 right-1 text-[8px] font-extrabold uppercase text-white leading-tight">TOURNOI<br /><span className="text-[6px] text-white/80 font-semibold">SAMEDI 20H</span></div>
          </div>
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
    <div className="absolute left-[58%] top-[26%]" style={{ animation: "hero-float 6s ease-in-out infinite 1.2s" }}>
      <div className="rounded-full border border-white/10 bg-card/80 px-3 py-1.5 text-[10px] font-semibold text-foreground backdrop-blur-xl shadow-lg">
        <span className="inline-flex items-center gap-1.5">
          <Subtitles className="h-3 w-3 text-primary" />
          Sous-titres auto
        </span>
      </div>
    </div>
    <div className="absolute left-[48%] bottom-[40%]" style={{ animation: "hero-float 7.5s ease-in-out infinite 0.6s" }}>
      <div className="rounded-full border border-white/10 bg-card/80 px-3 py-1.5 text-[10px] font-semibold text-foreground backdrop-blur-xl shadow-lg">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          3 variantes IA
        </span>
      </div>
    </div>

    {/* Mini content queue — bottom left */}
    <div className="absolute bottom-0 left-3 w-[210px]" style={{ animation: "hero-float 8.5s ease-in-out infinite 0.2s" }}>
      <div className="rounded-2xl border border-white/[0.08] bg-[hsl(220_20%_8%)]/95 p-3 backdrop-blur-xl shadow-[0_40px_100px_-30px_hsl(var(--primary)/0.3)]">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
          <span className="text-[10px] font-semibold text-foreground">File de contenu</span>
          <span className="text-[9px] text-muted-foreground">3 prêts</span>
        </div>
        <div className="mt-2 space-y-1.5">
          {QUEUE_ITEMS.map((item) => (
            <div key={item.title} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-background/40 px-2 py-1.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.tone === "primary" ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]" : item.tone === "info" ? "bg-info" : "bg-muted-foreground/50"}`} />
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
    <div className="relative aspect-[9/16]">
      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-br from-[hsl(264_45%_22%)] to-[hsl(220_30%_10%)]" />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-br from-[hsl(40_70%_55%)] to-[hsl(220_30%_15%)] border-b border-white/10" />
      <div className="absolute inset-x-2 bottom-4 rounded bg-black/85 px-1.5 py-1 text-center text-[9px] font-bold uppercase text-white">
        SOUS-TITRES <span className="text-primary">AUTO</span>
      </div>
      <span className="absolute left-2 top-2 rounded-md bg-primary/95 px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">9:16</span>
      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-destructive/95 px-1.5 py-0.5 text-[7px] font-bold text-white">
        <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
        LIVE
      </span>
    </div>
    <div className="flex items-center justify-between border-t border-white/10 px-2.5 py-1.5 text-[10px]">
      <span className="font-semibold text-foreground">Clip prêt</span>
      <span className="tabular-nums text-muted-foreground">00:42</span>
    </div>
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
