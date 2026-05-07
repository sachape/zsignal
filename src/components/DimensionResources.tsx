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
  const preview = resource.summary.slice(0, 110);
  const hasMore = resource.summary.length > 110;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-card/40 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.14] hover:shadow-[0_0_40px_hsl(var(--primary)/0.08)]">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.04),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-[0_0_16px_hsl(var(--primary)/0.15)] transition-shadow duration-300 group-hover:shadow-[0_0_24px_hsl(var(--primary)/0.25)] ${meta.color}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold leading-tight text-foreground">
              {resource.title}
            </p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${meta.color}`}
            >
              {meta.label}
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {expanded || !hasMore ? resource.summary : `${preview}…`}
          </p>

          <div className="mt-3 flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
              <Clock className="h-3 w-3" />
              {resource.duration}
            </span>
            {hasMore && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-0.5 text-[10px] font-semibold text-primary/80 transition-colors hover:text-primary"
              >
                {expanded ? (
                  <>Réduire <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>Lire tout <ChevronDown className="h-3 w-3" /></>
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
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Ressources pour progresser</h2>
          <p className="text-[10px] text-muted-foreground/60">Ciblées sur tes points faibles</p>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map(({ dimension, resources }) => (
          <div key={dimension}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {dimension}
            </p>
            <div className="space-y-3">
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
