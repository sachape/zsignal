import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareScoreCard from "@/components/ShareScoreCard";
import type { StreamScore } from "@/types/analysis";
import { buildScoreNarrative } from "@/services/streamScoreTier";

interface Props {
  score: StreamScore;
  displayName: string;
  login: string | null;
  date: string;
  variant?: "icon" | "button";
}

const ShareScoreButton = ({
  score,
  displayName,
  login,
  date,
  variant = "button",
}: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);
  const narrative = buildScoreNarrative(score);

  const handleCapture = async () => {
    if (!cardRef.current || capturing) return;
    setCapturing(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        // Prevent CORS issues with external resources by excluding images
        // (the card uses letter avatars only, so this is fine)
        skipFonts: false,
      });
      const link = document.createElement("a");
      link.download = `streamnco-score-${displayName.replace(/\s+/g, "_").toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.warn("[ShareScoreButton] capture failed", err);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <>
      {/* Off-screen card — rendered but hidden, used as capture target */}
      <div
        style={{
          position: "fixed",
          left: -9999,
          top: -9999,
          pointerEvents: "none",
          zIndex: -1,
        }}
        aria-hidden
      >
        <ShareScoreCard
          ref={cardRef}
          displayName={displayName}
          login={login}
          score={score.overall}
          miniBreakdown={narrative.miniBreakdown}
          date={date}
        />
      </div>

      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleCapture}
          disabled={capturing}
          title="Télécharger ma carte score"
          aria-label="Télécharger ma carte score"
        >
          {capturing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCapture}
          disabled={capturing}
          className="gap-2"
        >
          {capturing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {capturing ? "Génération…" : "Partager mon score"}
        </Button>
      )}
    </>
  );
};

export default ShareScoreButton;
