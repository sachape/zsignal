import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";

const FinalCtaSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const submit = () => {
    const login = normalizeChannelInput(username);
    if (!login) return;
    navigate(`/analyze?channel=${encodeURIComponent(login)}&mode=teaser`);
  };

  return (
    <section className="relative overflow-hidden py-28 md:py-36">
      {/* Strong centered glow — peak intensity */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_65%)] opacity-40" />

      <div ref={ref} className="container relative mx-auto max-w-3xl px-4 text-center md:px-6">
        <div
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.25)]">
            <Clock className="h-3 w-3" />
            Moins de 60 secondes
          </span>
          <h2 className="mt-5 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            Prêt à voir où tu en es&nbsp;?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Entre ton nom de chaîne et reçois ton diagnostic immédiatement.
            Gratuit, sans compte, sans installation.
          </p>
        </div>

        <div
          className="mx-auto mt-10 max-w-md"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1) 200ms, transform 700ms cubic-bezier(0.16,1,0.3,1) 200ms",
          }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 p-2 backdrop-blur-xl">
            <span className="bento-hero-border" aria-hidden />
            <div className="relative flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ton pseudo Twitch"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  className="h-11 border-transparent bg-transparent pl-9 focus-visible:ring-1"
                />
              </div>
              <Button onClick={submit} size="lg" className="h-11 shrink-0">
                Analyse ta chaîne gratuitement
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Lecture seule · données publiques uniquement · aucune publication
          </p>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
