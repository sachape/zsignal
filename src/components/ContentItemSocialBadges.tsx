// Format Réseaux — badges sur un content item généré au format vertical.
import { Smartphone, Video, MonitorPlay } from "lucide-react";

interface Props {
  outputFormat?: string | null;
  layoutType?: string | null;
}

export function ContentItemSocialBadges({ outputFormat, layoutType }: Props) {
  if (outputFormat !== "vertical_9_16") return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
        <Smartphone className="h-3 w-3" /> Format réseaux
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/40 px-2 py-0.5 text-foreground/80">
        <Video className="h-3 w-3" /> 9:16
      </span>
      {layoutType === "facecam_top_gameplay_bottom" && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/40 px-2 py-0.5 text-foreground/80">
          <MonitorPlay className="h-3 w-3" /> Caméra + gameplay
        </span>
      )}
      {layoutType === "gameplay_only" && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/40 px-2 py-0.5 text-foreground/80">
          <MonitorPlay className="h-3 w-3" /> Gameplay seul
        </span>
      )}
    </div>
  );
}
