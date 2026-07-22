import { Sparkles } from "lucide-react";

/**
 * Contextual "where will this visual end up" mockup.
 * Picks a destination mockup from the format's aspect ratio so the user
 * sees the placement (Twitch profile, phone story, Insta feed…) before generating.
 * The highlighted (primary) area = where the generated visual goes.
 */
type Kind =
  | "twitch-banner"
  | "video-screen"
  | "social-square"
  | "phone-story"
  | "feed-portrait"
  | "cover";

const kindOf = (width: number, height: number): Kind => {
  const r = width / (height || 1);
  if (r >= 1.5) {
    if (r >= 3.4) return "twitch-banner"; // ~4:1
    if (r >= 2.4) return "cover"; // ~3:1
    return "video-screen"; // ~16:9
  }
  if (r >= 0.9 && r <= 1.15) return "social-square"; // 1:1
  if (r < 0.7) return "phone-story"; // 9:16
  return "feed-portrait"; // ~4:5
};

const CAPTION: Record<Kind, string> = {
  "twitch-banner": "En haut de ta chaîne Twitch",
  "video-screen": "Ton écran hors-ligne Twitch",
  "social-square": "Dans ton feed Instagram / X",
  "phone-story": "En story plein écran",
  "feed-portrait": "En post portrait (feed)",
  cover: "Cover YouTube / Discord",
};

const Spark = () => (
  <Sparkles className="absolute right-1.5 top-1.5 h-3 w-3 text-primary-foreground/90" aria-hidden />
);
const fill = "bg-gradient-to-br from-primary/70 to-primary/30";

const Mock = ({ kind }: { kind: Kind }) => {
  switch (kind) {
    case "twitch-banner":
      return (
        <div className="w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30">
          <div className={`relative h-10 ${fill}`}>
            <Spark />
          </div>
          <div className="flex items-center gap-2 px-2 pb-2">
            <div className="-mt-4 h-7 w-7 rounded-full border-2 border-card bg-muted" />
            <div className="space-y-1">
              <div className="h-1.5 w-16 rounded bg-foreground/30" />
              <div className="h-1 w-10 rounded bg-foreground/15" />
            </div>
          </div>
        </div>
      );
    case "video-screen":
      return (
        <div className="w-full rounded-lg border border-border/60 bg-muted/30 p-2">
          <div className={`relative aspect-video overflow-hidden rounded ${fill}`}>
            <Spark />
            <div className="absolute inset-x-0 bottom-0 flex h-2.5 items-center gap-1 bg-black/35 px-1">
              <div className="h-1 w-1 rounded-full bg-white/70" />
              <div className="h-0.5 flex-1 rounded bg-white/30" />
            </div>
          </div>
        </div>
      );
    case "social-square":
      return (
        <div className="mx-auto w-4/5 overflow-hidden rounded-lg border border-border/60 bg-card">
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <div className="h-3.5 w-3.5 rounded-full bg-muted" />
            <div className="h-1 w-12 rounded bg-foreground/20" />
          </div>
          <div className={`relative aspect-square ${fill}`}>
            <Spark />
          </div>
          <div className="flex gap-1.5 px-2 py-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-foreground/25" />
            ))}
          </div>
        </div>
      );
    case "phone-story":
      return (
        <div className="mx-auto w-2/5 overflow-hidden rounded-[12px] border-2 border-border/70 bg-card p-0.5">
          <div className={`relative aspect-[9/16] overflow-hidden rounded-[9px] ${fill}`}>
            <div className="absolute inset-x-1.5 top-1.5 flex gap-0.5">
              <div className="h-0.5 flex-1 rounded bg-white/80" />
              <div className="h-0.5 flex-1 rounded bg-white/35" />
              <div className="h-0.5 flex-1 rounded bg-white/35" />
            </div>
            <Spark />
          </div>
        </div>
      );
    case "feed-portrait":
      return (
        <div className="mx-auto w-3/5 overflow-hidden rounded-lg border border-border/60 bg-card">
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <div className="h-3.5 w-3.5 rounded-full bg-muted" />
            <div className="h-1 w-12 rounded bg-foreground/20" />
          </div>
          <div className={`relative aspect-[4/5] ${fill}`}>
            <Spark />
          </div>
        </div>
      );
    case "cover":
      return (
        <div className="w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30">
          <div className={`relative h-12 ${fill}`}>
            <Spark />
          </div>
          <div className="space-y-1 px-2 py-2">
            <div className="h-1.5 w-20 rounded bg-foreground/25" />
            <div className="h-1 w-12 rounded bg-foreground/15" />
          </div>
        </div>
      );
  }
};

const VisualPlacementPreview = ({
  width,
  height,
  caption = false,
  className = "",
}: {
  width: number;
  height: number;
  caption?: boolean;
  className?: string;
}) => {
  const kind = kindOf(width, height);
  return (
    <div className={className}>
      <Mock kind={kind} />
      {caption && (
        <p className="mt-1.5 text-center text-[12px] text-muted-foreground/70">{CAPTION[kind]}</p>
      )}
    </div>
  );
};

export default VisualPlacementPreview;
