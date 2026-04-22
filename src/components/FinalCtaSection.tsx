import { useState, useRef, useEffect, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, AlertCircle } from "lucide-react";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";

const CSS = `
  @keyframes fc-in {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fc-pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
`;

function useVisible(threshold = 0.3) {
  const ref = useRef<HTMLElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible: v };
}

function anim(vis: boolean, delay = 0): CSSProperties {
  return vis
    ? { animation: `fc-in 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }
    : { opacity: 0 };
}

export default function FinalCtaSection() {
  const { ref, visible } = useVisible();
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAnalyze = () => {
    const login = normalizeChannelInput(username);
    if (!login) {
      setInputError("Entre un nom d'utilisateur Twitch valide ou une URL twitch.tv/...");
      return;
    }
    setInputError(null);
    navigate(`/analyze?channel=${encodeURIComponent(login)}&mode=teaser`);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <section
        ref={ref}
        className="relative overflow-hidden border-t border-border/50 py-32"
      >
        <div className="absolute inset-0 bg-dot-grid opacity-[0.15]" />
        {/* Strong central glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,hsl(var(--primary)/0.12),transparent)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[140px]"
        />

        <div className="container relative mx-auto max-w-2xl px-4 text-center md:px-6">
          <div style={anim(visible, 0)}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                style={{ animation: "fc-pulse 2s ease-in-out infinite" }}
              />
              Gratuit · 60 secondes
            </span>
          </div>

          <h2
            className="mx-auto mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl sm:leading-[1.1]"
            style={anim(visible, 80)}
          >
            Prêt à comprendre ta chaîne ?
          </h2>

          <p
            className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted-foreground"
            style={anim(visible, 160)}
          >
            Entre ton pseudo Twitch et reçois ton analyse complète — score, benchmarks
            et plan d'action — en moins d'une minute.
          </p>

          {/* CTA input */}
          <div className="mt-8" style={anim(visible, 240)}>
            <div className="flex gap-2 rounded-xl border border-primary/20 bg-card/80 p-1.5 shadow-[0_0_60px_hsl(var(--primary)/0.15)] backdrop-blur-sm">
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
                className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-shadow duration-300 hover:shadow-[0_0_32px_hsl(var(--primary)/0.6)]"
              >
                Analyser gratuitement
                <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {inputError && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-destructive">
                <AlertCircle style={{ width: 14, height: 14 }} />
                {inputError}
              </p>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              Aucun compte requis · Tes données restent privées · Résultat en 60 secondes
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
