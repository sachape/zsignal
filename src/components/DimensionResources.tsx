import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Clock, Dumbbell, Lightbulb, Layers } from "lucide-react";
import type { Resource } from "@/services/resourceLibrary";
import { getResourcesForWeakDimensions } from "@/services/resourceLibrary";
import type { ScoreBreakdownItem } from "@/types/analysis";

interface Props {
  breakdown: ScoreBreakdownItem[];
  maxDimensions?: number;
}

const TYPE_META: Record<
  Resource["type"],
  { label: string; icon: React.ElementType; color: string }
> = {
  conseil: {
    label: "Conseil",
    icon: Lightbulb,
    color: "text-primary border-primary/20 bg-primary/[0.06]",
  },
  exercice: {
    label: "Exercice",
    icon: Dumbbell,
    color: "text-warning border-warning/20 bg-warning/[0.06]",
  },
  concept: {
    label: "Concept",
    icon: Layers,
    color: "text-info border-info/20 bg-info/[0.06]",
  },
};

const ResourceCard = ({ resource }: { resource: Resource }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[resource.type];
  const Icon = meta.icon;
  const preview = resource.summary.slice(0, 90);
  const hasMore = resource.summary.length > 90;

  return (
    <div className="rounded-lg border border-border/40 bg-card/30 p-3.5 transition-colors hover:border-border/70">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${meta.color}`}
        >
          <Icon className="h-3 w-3" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold leading-tight text-foreground">
              {resource.title}
            </p>
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${meta.color}`}
            >
              {meta.label}
            </span>
          </div>

          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {expanded || !hasMore
              ? resource.summary
              : `${preview}…`}
          </p>

          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Clock className="h-3 w-3" />
              {resource.duration}
            </span>
            {hasMore && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline"
              >
                {expanded ? (
                  <>
                    Réduire <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Lire tout <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DimensionResources = ({ breakdown, maxDimensions = 2 }: Props) => {
  const sections = getResourcesForWeakDimensions(breakdown, maxDimensions);

  if (sections.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Ressources pour progresser
        </h2>
        <span className="rounded-full border border-border/40 bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
          Ciblées sur tes points faibles
        </span>
      </div>

      <div className="space-y-5">
        {sections.map(({ dimension, resources }) => (
          <div key={dimension}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {dimension}
            </p>
            <div className="space-y-2">
              {resources.slice(0, 3).map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DimensionResources;
