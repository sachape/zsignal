import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Playbook } from "@/services/playbookLibrary";

interface Props {
  playbook: Playbook;
  highlighted?: boolean;
}

function ImpactDot({ impact }: { impact: Playbook["impact"] }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        impact === "high" ? "bg-primary" : "bg-muted-foreground/40",
      )}
    />
  );
}

const PlaybookCard = ({ playbook, highlighted = false }: Props) => {
  return (
    <Link
      to={`/playbooks/${playbook.slug}`}
      className={cn(
        "group flex flex-col rounded-2xl border p-5 backdrop-blur-sm transition-all hover:bg-card/60 hover:shadow-[0_0_24px_-8px] hover:shadow-primary/15",
        highlighted
          ? "border-primary/30 bg-primary/[0.03] hover:border-primary/50"
          : "border-foreground/[0.08] bg-card/40 hover:border-primary/20",
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 transition-colors group-hover:bg-primary/10">
          <BookOpen className="h-4 w-4 text-accent transition-colors group-hover:text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground leading-snug">
            {playbook.title}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {playbook.summary}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-foreground/[0.08] bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" /> {playbook.timeMinutes} min
        </div>
      </div>

      {/* Why callout */}
      <p className="mb-4 flex-1 rounded-lg bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        {playbook.why}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ImpactDot impact={playbook.impact} />
          <span className="text-[10px] text-muted-foreground/60">
            {playbook.impact === "high" ? "Fort impact" : "Impact moyen"}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Lire le playbook <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
};

export default PlaybookCard;
