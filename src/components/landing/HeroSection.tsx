import { useEffect, useRef, useState } from "react";
import {
  Activity, ArrowRight, Captions, CheckCircle2, Clapperboard,
  Download, Scissors, ShieldCheck, Sparkles, Timer,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import HeroChannelSearch from "@/components/HeroChannelSearch";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import facecamAvatar from "@/assets/avatar-gamer-1.jpg";
import proofAvatar2 from "@/assets/avatar-gamer-2.jpg";
import proofAvatar3 from "@/assets/avatar-gamer-3.jpg";

const EASE = [0.16, 1, 0.3, 1] as const;
const CAPTION_WORDS = ["le", "clutch", "qui", "change", "TOUT"];
const SCORE_DIMS = [
  { label: "Régularité", pct: 82 },
  { label: "Clips", pct: 68 },
  { label: "Catégorie", pct: 74 },
];

/* Count a number up to `target` once `active` flips true. */
const useCountUp = (target: number, active: boolean, duration = 1100) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setV(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return v;
};

/**
 * High-fidelity, self-animating product window. Loops a believable
 * "clip generation → ready" cycle: scrubbing playhead, captions typing in,
 * a generation pill flipping to ready, and a StreamScore that fills.
 */
const StudioWindow = () => {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"gen" | "ready">(reduce ? "ready" : "gen");
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.3 });
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setPhase((p) => (p === "gen" ? "ready" : "gen")), 3200);
    return () => clearInterval(t);
  }, [reduce]);

  const score = useCountUp(73, seen && phase === "ready");
  const ringR = 26;
  const ringC = 2 * Math.PI * ringR;

  return (
    <motion.div
      ref={ref}
      className="relative"
      animate={reduce ? undefined : { y: [0, -10, 0] }}
      transition={reduce ? undefined : { duration: 7, ease: "easeInOut", repeat: Infinity }}
    >
      {/* ambient bloom behind the window */}
      <div className="pointer-events-none absolute -inset-10 rounded-[2.5rem] bg-primary/[0.10] blur-[60px]" aria-hidden />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 28, rotateX: 6 }}
        animate={seen ? { opacity: 1, y: 0, rotateX: 0 } : undefined}
        transition={{ duration: 1, ease: EASE, delay: 0.15 }}
        style={{ transformPerspective: 1200 }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0b0e12]/95 shadow-[0_40px_120px_-50px_rgba(190,255,90,0.45)] backdrop-blur-2xl"
      >
        <span className="landing-grain pointer-events-none absolute inset-0" aria-hidden />

        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1">
            <Clapperboard className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">app.streamnco.fr / studio</span>
          </div>
          <div className="w-12" />
        </div>

        {/* Editor body */}
        <div className="grid grid-cols-[150px_1fr] gap-0">
          {/* Left: vertical clip preview */}
          <div className="border-r border-white/[0.06] p-3">
            <div className="relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-lg border border-white/[0.08]">
              <img src={facecamAvatar} alt="" aria-hidden className="absolute inset-x-0 top-0 h-[44%] w-full object-cover" />
              <div className="absolute inset-x-0 top-0 h-[44%] bg-gradient-to-b from-black/10 to-[#0a0d0c]/70" />
              <div className="absolute inset-x-0 bottom-0 top-[44%] bg-[linear-gradient(160deg,#1c2a16,#0a0d0c)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(190,255,90,0.18),transparent_55%)]" />
              {/* facecam chip */}
              <div className="absolute left-2 top-2 rounded-md border border-white/15 bg-black/45 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wide text-primary backdrop-blur-sm">
                Facecam
              </div>
              {/* typing caption */}
              <div className="absolute inset-x-2 bottom-9 flex flex-wrap justify-center gap-1">
                {CAPTION_WORDS.map((w, i) => (
                  <motion.span
                    key={w}
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.25, delay: 0.3 + i * 0.32, repeat: Infinity, repeatDelay: 4.6, repeatType: "reverse" }}
                    className={`rounded px-1 text-[8px] font-extrabold uppercase leading-none ${i === CAPTION_WORDS.length - 1 ? "bg-primary text-primary-foreground" : "text-white"}`}
                  >
                    {w}
                  </motion.span>
                ))}
              </div>
              {/* progress scrubber */}
              <div className="absolute inset-x-2 bottom-3 h-1 overflow-hidden rounded-full bg-white/15">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: "8%" }}
                  animate={reduce ? { width: "72%" } : { width: ["8%", "92%", "8%"] }}
                  transition={reduce ? { duration: 0 } : { duration: 6.4, ease: "linear", repeat: Infinity }}
                />
              </div>
            </div>
          </div>

          {/* Right: pipeline + score */}
          <div className="space-y-3 p-4">
            {/* generation status pill */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Auto-clip</span>
              <AnimatePresence mode="wait">
                {phase === "gen" ? (
                  <motion.span
                    key="gen"
                    initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                  >
                    <motion.span
                      className="h-2.5 w-2.5 rounded-full border-[1.5px] border-primary border-t-transparent"
                      animate={reduce ? undefined : { rotate: 360 }}
                      transition={reduce ? undefined : { duration: 0.8, ease: "linear", repeat: Infinity }}
                    />
                    Génération…
                  </motion.span>
                ) : (
                  <motion.span
                    key="ready"
                    initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Prêt
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* pipeline steps */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Scissors, label: "Découpe" },
                { icon: Captions, label: "Sous-titres" },
                { icon: Download, label: "Export 9:16" },
              ].map(({ icon: Icon, label }, i) => (
                <motion.div
                  key={label}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={seen ? { opacity: 1, y: 0 } : undefined}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.5 + i * 0.12 }}
                  className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <p className="mt-1.5 text-[9px] font-medium text-foreground/90">{label}</p>
                </motion.div>
              ))}
            </div>

            {/* StreamScore */}
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                  <circle cx="32" cy="32" r={ringR} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.3" strokeWidth="5" />
                  <motion.circle
                    cx="32" cy="32" r={ringR} fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={ringC}
                    initial={{ strokeDashoffset: ringC }}
                    animate={seen ? { strokeDashoffset: ringC - (score / 100) * ringC } : undefined}
                    transition={{ duration: 0.2 }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-foreground">{score}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80">StreamScore</p>
                <div className="mt-1.5 space-y-1">
                  {SCORE_DIMS.map((d, i) => (
                    <div key={d.label} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-[9px] text-muted-foreground">{d.label}</span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-primary/80"
                          initial={{ width: 0 }}
                          animate={seen ? { width: `${d.pct}%` } : undefined}
                          transition={{ duration: 0.9, ease: EASE, delay: 0.7 + i * 0.12 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const HeroSection = () => {
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

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE, delay },
  });

  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 md:pt-40 md:pb-28">
      {/* Restraint: one calm light source + grain. No aurora theatrics. */}
      <div className="pointer-events-none absolute inset-0 bg-background" />
      <div className="pointer-events-none absolute left-1/2 top-[-10rem] h-[34rem] w-[50rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.10),transparent_70%)] blur-2xl" aria-hidden />
      <div className="landing-grain pointer-events-none absolute inset-0 opacity-50" aria-hidden />

      <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          {/* Left — message + lead magnet */}
          <div>
            <motion.span
              {...rise(0)}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" /> Pour les streamers qui veulent grandir
            </motion.span>

            <motion.h1
              {...rise(0.07)}
              className="mt-6 max-w-3xl text-[2.75rem] font-bold leading-[0.98] tracking-[-0.02em] text-foreground sm:text-6xl md:text-[4.2rem]"
            >
              Plus de clips, plus de vues,{" "}
              <span className="text-primary">plus d'abonnés.</span>
            </motion.h1>

            <motion.p {...rise(0.14)} className="mt-6 max-w-lg text-base leading-8 text-muted-foreground md:text-lg">
              Streamnco transforme tes lives en clips et visuels prêts à poster, et te montre noir sur blanc ce qui fait grandir ta chaîne. Tout part de ton stream.
            </motion.p>

            <motion.div {...rise(0.2)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="group relative gap-2 overflow-hidden shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)]" onClick={() => openAuthModal("signup")}>
                <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 bg-white/25 blur-md transition-[transform] duration-700 group-hover:translate-x-[420%]" aria-hidden />
                Essayer gratuitement
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/fonctionnalites">Voir les fonctionnalités</Link>
              </Button>
            </motion.div>

            {/* Social proof — real faces, no invented metric */}
            <motion.div {...rise(0.24)} className="mt-7 flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {[facecamAvatar, proofAvatar2, proofAvatar3].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    aria-hidden
                    className="h-9 w-9 rounded-full border-2 border-background object-cover"
                  />
                ))}
              </div>
              <p className="text-sm leading-snug text-muted-foreground">
                <span className="font-semibold text-foreground">Les streamers fondateurs</span> préparent déjà leurs lives avec Streamnco.
              </p>
            </motion.div>

            <motion.div {...rise(0.3)} className="mt-7 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              {["Clips 9:16 prêts à poster", "Visuels réseaux en un clic", "Ta progression, en clair"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </motion.div>

            {/* Lead magnet */}
            <motion.div
              {...rise(0.32)}
              className="group mt-8 max-w-lg rounded-2xl border border-white/[0.08] bg-black/25 p-3 shadow-[0_24px_80px_-54px_rgba(190,255,90,0.55)] backdrop-blur-xl"
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Teste le diagnostic Twitch</span> — gratuit, sans connexion
                </p>
                <span className="hidden rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">60 s</span>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/30 to-[hsl(150_80%_55%)]/20 opacity-0 blur transition-opacity duration-500 group-focus-within:opacity-100" aria-hidden />
                <div className="relative">
                  <HeroChannelSearch
                    value={username}
                    onChange={(next) => { setUsername(next); if (inputError) setInputError(null); }}
                    onSubmit={(login, gameName) => handleAnalyze(login, gameName)}
                    inputError={inputError}
                  />
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-[11px] text-muted-foreground">
                {[
                  { icon: ShieldCheck, label: "Lecture seule" },
                  { icon: Timer, label: "Aperçu en 60 s" },
                  { icon: Activity, label: "Score + recommandations" },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="inline-flex items-center gap-1.5">
                    <Icon className="h-3 w-3 text-primary" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Right — animated product window */}
          <StudioWindow />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
