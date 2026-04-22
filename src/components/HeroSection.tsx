import { useState, useRef, useEffect, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";

const SCORE = 62;
const RING_R = 52;
const RING_CIRC = 2 * Math.PI * RING_R;
const RING_SZ = 132;
const RC = RING_SZ / 2;

const CSS = `
  @keyframes hs-in {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes hs-spin    { to { transform:rotate(360deg); } }
  @keyframes hs-pulse   { 0%,100% { opacity:1; } 50% { opacity:.35; } }
  @keyframes hs-float   { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-7px); } }
  @keyframes hs-grad {
    0%,100% { background-position:0% center; }
    50%      { background-position:100% center; }
  }
`;

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function inStyle(delay: number): CSSProperties {
  return { animation: `hs-in 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` };
}

export default function HeroSection() {
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [display, setDisplay] = useState(0);
  const [ringOff, setRingOff] = useState(RING_CIRC);
  const navigate = useNavigate();
  const rafRef = useRef<number>(0);

  const handleAnalyze = () => {
    const login = normalizeChannelInput(username);
    if (!login) {
      setInputError(
        "Entre un nom d'utilisateur Twitch valide ou une URL twitch.tv/...",
      );
      return;
    }
    setInputError(null);
    navigate(`/analyze?channel=${encodeURIComponent(login)}&mode=teaser`);
  };

  useEffect(() => {
    const id = setTimeout(() => {
      const dur = 1600;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / dur, 1);
        const e = easeOut(t);
        setDisplay(Math.round(e * SCORE));
        setRingOff(RING_CIRC * (1 - (e * SCORE) / 100));
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, 600);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <section className="relative overflow-hidden pt-32 pb-20">
        {/* Background atmosphere */}
        <div className="absolute inset-0 bg-dot-grid opacity-[0.15]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,hsl(var(--primary)/0.13),transparent)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[10%] top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]"
        />

        <div className="container relative mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid items-center gap-16 lg:grid-cols-[55%_45%]">

            {/* ── Left: copy + CTA ──────────────────────────────── */}
            <div>
              <div style={inStyle(0)}>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                    style={{ animation: "hs-pulse 2s ease-in-out infinite" }}
                  />
                  Copilote de croissance Twitch
                </span>
              </div>

              <h1
                className="mt-6 text-5xl font-bold tracking-tight text-foreground lg:text-[3.6rem] lg:leading-[1.1]"
                style={inStyle(80)}
              >
                Comprends ta chaîne.{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "hs-grad 5s ease infinite",
                  }}
                >
                  Construis ta progression.
                </span>
              </h1>

              <p
                className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
                style={inStyle(150)}
              >
                StreamPulse analyse tes données Twitch et te donne chaque
                semaine un plan d'action clair — score, benchmarks, et
                priorités concrètes.
              </p>

              {/* CTA input */}
              <div className="mt-8" style={inStyle(220)}>
                <div className="flex max-w-md gap-2 rounded-xl border border-primary/20 bg-card/80 p-1.5 shadow-[0_0_50px_hsl(var(--primary)/0.1)] backdrop-blur-sm">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      style={{ width: 16, height: 16 }}
                    />
                    <input
                      type="text"
                      placeholder="ton pseudo Twitch"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (inputError) setInputError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                      className="h-10 w-full rounded-lg border-0 bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      aria-invalid={!!inputError}
                    />
                  </div>
                  <button
                    onClick={handleAnalyze}
                    className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-shadow duration-300 hover:shadow-[0_0_32px_hsl(var(--primary)/0.6)]"
                  >
                    Analyser gratuitement
                    <ArrowRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                {inputError && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle style={{ width: 14, height: 14 }} />
                    {inputError}
                  </p>
                )}

                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {["Gratuit", "Aucun compte requis", "Résultat en 60 sec"].map(
                    (t) => (
                      <span key={t} className="flex items-center gap-1.5">
                        <CheckCircle2
                          className="text-success"
                          style={{ width: 14, height: 14 }}
                        />
                        {t}
                      </span>
                    ),
                  )}
                </p>

                <p className="mt-3 text-xs text-muted-foreground">
                  <button
                    onClick={() => navigate("/auth?redirect=/dashboard")}
                    className="cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-primary"
                  >
                    Déjà un compte ? Se connecter →
                  </button>
                </p>
              </div>
            </div>

            {/* ── Right: floating StreamScore visual ────────────── */}
            <div
              className="relative hidden items-center justify-center lg:flex"
              style={inStyle(350)}
            >
              {/* Ambient glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute h-80 w-80 rounded-full bg-primary/8 blur-[80px]"
              />

              {/* Card with rotating border beam */}
              <div
                className="relative overflow-hidden rounded-2xl"
                style={{ animation: "hs-float 6s ease-in-out 0.5s infinite" }}
              >
                {/* Spinning conic gradient = border beam */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute"
                  style={{
                    top: "-50%",
                    left: "-50%",
                    width: "200%",
                    height: "200%",
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, hsl(95,98%,61%,.65) 38deg, hsl(172,66%,50%,.45) 58deg, transparent 85deg)",
                    animation: "hs-spin 7s linear infinite",
                  }}
                />
                {/* Inner mask */}
                <div className="absolute inset-[1px] rounded-[15px] bg-card" />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center gap-4 p-8">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Score global
                  </p>

                  <div className="relative">
                    <svg
                      width={RING_SZ}
                      height={RING_SZ}
                      className="-rotate-90"
                      aria-hidden
                    >
                      <defs>
                        <linearGradient
                          id="hs-ring-grad"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="hsl(95,98%,61%)" />
                          <stop offset="100%" stopColor="hsl(172,66%,50%)" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx={RC}
                        cy={RC}
                        r={RING_R}
                        fill="none"
                        stroke="hsl(220,14%,16%)"
                        strokeWidth="8"
                      />
                      <circle
                        cx={RC}
                        cy={RC}
                        r={RING_R}
                        fill="none"
                        stroke="url(#hs-ring-grad)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={RING_CIRC}
                        strokeDashoffset={ringOff}
                        style={{
                          transition: "stroke-dashoffset 0.05s linear",
                          filter:
                            "drop-shadow(0 0 6px hsl(95,98%,61%,.5))",
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-mono text-[2.5rem] font-bold tabular-nums leading-none text-foreground">
                        {display}
                      </span>
                      <span className="mt-1 text-xs text-muted-foreground">
                        sur 100
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      StreamScore
                    </p>
                    <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        style={{
                          animation: "hs-pulse 2s ease-in-out infinite",
                        }}
                      />
                      Bon — En progression
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating metric chips */}
              <div
                className="absolute -left-6 top-10 rounded-xl border border-border/60 bg-card/90 px-4 py-2.5 backdrop-blur-sm"
                style={{
                  animation: "hs-float 5.5s ease-in-out 0.6s infinite",
                }}
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Engagement
                </p>
                <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-primary">
                  78%
                </p>
              </div>

              <div
                className="absolute -right-5 bottom-16 rounded-xl border border-border/60 bg-card/90 px-4 py-2.5 backdrop-blur-sm"
                style={{ animation: "hs-float 7s ease-in-out 1s infinite" }}
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Viewers
                </p>
                <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-primary">
                  +12%
                </p>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div
            className="mt-20 grid grid-cols-3 gap-8 border-t border-border/30 pt-10 md:mx-auto md:max-w-lg"
            style={inStyle(450)}
          >
            {[
              { val: "500+", label: "streamers analysés" },
              { val: "60s", label: "temps de résultat" },
              { val: "4.8/5", label: "note moyenne" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                  {s.val}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
