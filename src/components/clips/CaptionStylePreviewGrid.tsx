// V1 — Animated preview grid for caption style presets.
// Pure CSS/SVG mocks: no video assets, no heavy components. Each card
// shows a tiny looping gameplay-like background with subtitle cues that
// match the exact visual treatment used by the worker's ASS renderer.
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CaptionStyle =
  | "clean"
  | "bold_tiktok"
  | "gaming_neon"
  | "minimal"
  | "creator_pop"
  | "punchline";

interface Preset {
  id: CaptionStyle;
  name: string;
  promise: string;
}

const PRESETS: Preset[] = [
  { id: "clean", name: "Clean", promise: "Sobre et lisible" },
  { id: "bold_tiktok", name: "Bold TikTok", promise: "Impact fort" },
  { id: "gaming_neon", name: "Gaming Neon", promise: "Énergique" },
  { id: "minimal", name: "Minimal", promise: "Discret et élégant" },
  { id: "creator_pop", name: "Creator Pop", promise: "Dynamique et moderne" },
  { id: "punchline", name: "Punchline", promise: "Gros impact" },
];

// Three short cues cycled in every preview to mimic real subtitle rhythm.
const CUES = ["On push maintenant", "Attends, il est low HP", "Énorme clutch"];

interface CueProps {
  style: CaptionStyle;
}

function CaptionCue({ style }: CueProps) {
  // Common: each cue fades in/out via the keyframe defined in this file.
  // The visual treatment per preset is applied inline via classes.
  const base =
    "absolute left-1/2 bottom-3 -translate-x-1/2 whitespace-nowrap font-bold tracking-tight";

  if (style === "clean") {
    return (
      <div
        className={cn(base, "text-white text-[11px]")}
        style={{ textShadow: "0 0 2px #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000" }}
      >
        <CueText />
      </div>
    );
  }
  if (style === "bold_tiktok") {
    return (
      <div
        className={cn(base, "text-[13px]")}
        style={{ textShadow: "0 0 2px #000, 1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000" }}
      >
        <CueText accentColor="#FFE129" />
      </div>
    );
  }
  if (style === "gaming_neon") {
    return (
      <div
        className={cn(base, "text-[11.5px]")}
        style={{
          color: "#89FD3A",
          textShadow:
            "0 0 4px #89FD3A, 0 0 8px #3AFD89, 1px 1px 0 #000, -1px -1px 0 #000",
        }}
      >
        <CueText />
      </div>
    );
  }
  // minimal
  return (
    <div
      className={cn(base, "text-[10px] font-medium")}
      style={{ color: "#F2F2F2", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
    >
      <CueText />
    </div>
  );
}

function CueText({ accentColor }: { accentColor?: string }) {
  // Animated cycling of 3 cues using staggered opacity keyframes.
  return (
    <span className="relative inline-block">
      {CUES.map((cue, i) => (
        <span
          key={cue}
          className="absolute left-1/2 -translate-x-1/2 bottom-0"
          style={{
            animation: `captionCue 4.5s ${i * 1.5}s infinite`,
            opacity: 0,
          }}
        >
          {accentColor && i === 2 ? (
            <span style={{ color: accentColor }}>{cue}</span>
          ) : accentColor && i === 1 ? (
            <>
              {cue.split(",")[0]},{" "}
              <span style={{ color: accentColor }}>{cue.split(",")[1]?.trim()}</span>
            </>
          ) : (
            cue
          )}
        </span>
      ))}
      {/* Reserve width with the widest cue (invisible) */}
      <span className="invisible">{CUES[1]}</span>
    </span>
  );
}

function MiniGameplay() {
  // Faux gameplay: animated gradient + drifting "minimap" dots.
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(135deg, #1a3a2e 0%, #0f1f3a 40%, #2a1a3a 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 30% 40%, rgba(137,253,58,0.3), transparent 40%), radial-gradient(circle at 70% 60%, rgba(58,180,253,0.25), transparent 45%)",
          animation: "gameplayDrift 6s ease-in-out infinite alternate",
        }}
      />
      {/* Fake HUD top-left */}
      <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
        <div className="h-1 w-6 rounded-full bg-red-500/80" />
        <div className="h-1 w-4 rounded-full bg-blue-400/70" />
      </div>
      {/* Fake crosshair */}
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
        <div className="h-2 w-2 rounded-full border border-white/60" />
      </div>
    </div>
  );
}

interface Props {
  value: CaptionStyle;
  onChange: (v: CaptionStyle) => void;
  disabled?: boolean;
}

export function CaptionStylePreviewGrid({ value, onChange, disabled }: Props) {
  return (
    <>
      <style>{`
        @keyframes captionCue {
          0%, 5% { opacity: 0; transform: translate(-50%, 4px); }
          10%, 30% { opacity: 1; transform: translate(-50%, 0); }
          35%, 100% { opacity: 0; transform: translate(-50%, -2px); }
        }
        @keyframes gameplayDrift {
          0% { transform: translateX(-3%) scale(1.05); }
          100% { transform: translateX(3%) scale(1.1); }
        }
      `}</style>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => {
          const selected = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(p.id)}
              aria-pressed={selected}
              className={cn(
                "group relative overflow-hidden rounded-md border bg-card text-left transition",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                selected
                  ? "border-primary ring-1 ring-primary/40"
                  : "border-border hover:border-border/80",
                disabled && "opacity-50 pointer-events-none",
              )}
            >
              {/* 9:16-ish preview canvas, capped for grid density */}
              <div className="relative aspect-[9/10] w-full overflow-hidden">
                <MiniGameplay />
                <CaptionCue style={p.id} />
                {selected && (
                  <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="border-t border-border/60 px-2 py-1.5">
                <p className="text-[11px] font-semibold text-foreground">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.promise}</p>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
