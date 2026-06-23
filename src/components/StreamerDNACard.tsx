import { ArrowRight, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type StreamerDNA } from "@/services/streamerDNA";

const COLOR_CLASSES: Record<StreamerDNA["color"], { border: string; bg: string; text: string; badge: string }> = {
  primary: {
    border: "border-primary/30",
    bg: "bg-primary/5",
    text: "text-primary-strong",
    badge: "bg-primary/10 text-primary-strong border-primary/20",
  },
  warning: {
    border: "border-warning/30",
    bg: "bg-warning/5",
    text: "text-warning",
    badge: "bg-warning/10 text-warning border-warning/20",
  },
  destructive: {
    border: "border-destructive/30",
    bg: "bg-destructive/5",
    text: "text-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
  },
  emerald: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    text: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  violet: {
    border: "border-violet-500/30",
    bg: "bg-violet-500/5",
    text: "text-violet-400",
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  sky: {
    border: "border-sky-500/30",
    bg: "bg-sky-500/5",
    text: "text-sky-400",
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
};

interface Props {
  dna: StreamerDNA;
  login?: string | null;
}

const StreamerDNACard = ({ dna, login }: Props) => {
  const c = COLOR_CLASSES[dna.color];

  return (
    <Card className={cn("overflow-hidden", c.border, c.bg)}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{dna.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", c.text)}>
                  Profil Streamer
                </span>
              </div>
              <p className="mt-0.5 text-lg font-bold leading-tight text-foreground">
                {dna.archetype}
              </p>
              <p className="text-xs text-muted-foreground">{dna.subtitle}</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground"
            title="Partager"
            onClick={() => {
              const text = `Mon profil Streamnco : ${dna.archetype} ${dna.icon}${login ? ` (@${login})` : ""} — streamnco.fr`;
              navigator.clipboard.writeText(text);
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Description */}
        <p className="mt-3.5 text-sm text-muted-foreground leading-relaxed">
          {dna.description}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Strengths */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Points forts
            </p>
            {dna.strengths.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", `bg-${dna.color === "primary" ? "primary" : dna.color === "emerald" ? "emerald-400" : dna.color === "sky" ? "sky-400" : dna.color === "violet" ? "violet-400" : dna.color === "warning" ? "warning" : "destructive"}`)} />
                <span className="text-xs text-foreground">{s}</span>
              </div>
            ))}
          </div>

          {/* Blindspot */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Point aveugle
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{dna.blindspot}</p>
          </div>
        </div>

        {/* Next step */}
        <div className={cn("mt-4 flex items-start gap-2.5 rounded-lg border p-3", c.border, "bg-background/40")}>
          <ArrowRight className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", c.text)} />
          <p className="text-xs text-foreground leading-relaxed">
            <span className="font-semibold">Priorité :</span> {dna.nextStep}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreamerDNACard;
