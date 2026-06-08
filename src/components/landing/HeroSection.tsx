import { useEffect, useState } from "react";
import { ShieldCheck, Timer, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeroChannelSearch from "@/components/HeroChannelSearch";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";

const HeroSection = () => {
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
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
    <section className="relative overflow-hidden bg-background pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-20">
      {/* Pixel decoration — scattered stars/bolts */}
      <span className="pointer-events-none absolute right-[8%] top-[18%] text-4xl text-primary opacity-50 select-none" aria-hidden>✦</span>
      <span className="pointer-events-none absolute left-[5%] top-[30%] text-2xl select-none opacity-40" style={{ color: "hsl(var(--brand-purple, 258 47% 48%))" }} aria-hidden>★</span>
      <span className="pointer-events-none absolute right-[14%] top-[60%] text-xl text-primary opacity-30 select-none" aria-hidden>⚡</span>
      <span className="pointer-events-none absolute left-[10%] bottom-[20%] text-3xl select-none opacity-25" style={{ color: "hsl(25 88% 55%)" }} aria-hidden>✦</span>

      <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px]">

          {/* ── Left: content ── */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Speech-bubble badge */}
            <div className="mb-6 inline-block">
              <div
                className="relative rounded-xl bg-foreground px-4 py-2 font-display text-sm font-bold text-background"
              >
                ⚡ GG ! 8 000+ chaînes analysées
                <span
                  className="absolute -bottom-2 left-6 block h-3 w-3 rotate-45 bg-foreground"
                  aria-hidden
                />
              </div>
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl font-bold leading-tight text-foreground sm:text-6xl md:text-7xl">
              Level up<br />
              ta chaîne.<br />
              <span className="text-primary">En 60 secondes.</span>
            </h1>

            {/* Sub */}
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              Streamnco analyse tes stats Twitch et te dit{" "}
              <strong className="font-semibold text-foreground">exactement quoi faire</strong>{" "}
              pour gagner plus de viewers, d'abonnés, et comprendre ce qui freine ta croissance.
            </p>

            {/* Platform selector */}
            <div className="mt-8 mb-4 flex">
              <div className="inline-flex items-center gap-0.5 rounded-full border-2 border-foreground/70 bg-card p-1"
                style={{ boxShadow: "2px 2px 0 0 rgba(23,29,46,0.5)" }}>
                <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
                  <span className="h-2 w-2 rounded-full bg-[#9146FF] shadow-[0_0_6px_#9146FF]" />
                  Twitch
                </div>
                <div className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground/50" aria-disabled="true">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  Kick
                  <span className="rounded-full border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
                    Bientôt
                  </span>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="max-w-lg">
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

            {/* Trust signals */}
            <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
              {[
                { icon: ShieldCheck, label: "Sans connexion Twitch" },
                { icon: Timer, label: "Résultat en 45 secondes" },
                { icon: Activity, label: "Gratuit, sans carte bancaire" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-primary" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Right: illustration (fond crème = blend naturel, pas de shadow) ── */}
          <div
            className="relative hidden lg:block"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(30px)",
              transition: "opacity 900ms cubic-bezier(0.16,1,0.3,1) 200ms, transform 900ms cubic-bezier(0.16,1,0.3,1) 200ms",
            }}
          >
            <img
              src="/illustrations/neon-crew.png"
              alt=""
              aria-hidden
              loading="eager"
              className="w-full max-w-sm xl:max-w-md"
            />

            {/* Floating speech-bubble chip: Score */}
            <div
              className="absolute -left-6 top-[28%] rounded-xl border-2 border-foreground/80 bg-card px-3.5 py-2.5"
              style={{ boxShadow: "3px 3px 0 0 rgba(23,29,46,0.7)", animation: "hero-float 6s ease-in-out infinite" }}
              aria-hidden
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">StreamScore</p>
              <p className="mt-0.5 font-display text-2xl font-bold text-primary">64</p>
              <p className="text-[9px] text-muted-foreground">/ 100 · Diagnostic IA</p>
            </div>

            {/* Floating speech-bubble chip: Action */}
            <div
              className="absolute -right-4 bottom-[22%] w-[170px] rounded-xl border-2 border-foreground/80 bg-card px-3.5 py-2.5"
              style={{ boxShadow: "3px 3px 0 0 rgba(23,29,46,0.7)", animation: "hero-float 7s ease-in-out infinite 0.8s" }}
              aria-hidden
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Action #1</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-foreground">Fixer 2 créneaux récurrents</p>
              <span className="mt-1.5 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary">+XP régularité</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
