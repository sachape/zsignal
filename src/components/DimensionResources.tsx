import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Clock, Dumbbell, Lightbulb, Layers, Sparkles } from "lucide-react";
import type { Resource } from "@/services/resourceLibrary";
import { getResourcesForWeakDimensions } from "@/services/resourceLibrary";
import type { ScoreBreakdownItem } from "@/types/analysis";
import { cn } from "@/lib/utils";

interface Props {
  breakdown: ScoreBreakdownItem[];
  maxDimensions?: number;
}

const TYPE_META = {
  conseil: {
    label: "Conseil",
    icon: Lightbulb,
    iconBg: "bg-primary/15 border-primary/25 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.25)]",
    badge: "border-primary/20 bg-primary/[0.07] text-primary",
    topLine: "from-primary/40 via-primary/20 to-transparent",
    hoverBorder: "hover:border-primary/30",
    hoverGlow: "hover:shadow-[0_0_40px_hsl(var(--primary)/0.10)]",
  },
  exercice: {
    label: "Exercice",
    icon: Dumbbell,
    iconBg: "bg-warning/15 border-warning/25 text-warning shadow-[0_0_20px_hsl(var(--warning)/0.25)]",
    badge: "border-warning/20 bg-warning/[0.07] text-warning",
    topLine: "from-warning/40 via-warning/20 to-transparent",
    hoverBorder: "hover:border-warning/30",
    hoverGlow: "hover:shadow-[0_0_40px_hsl(var(--warning)/0.10)]",
  },
  concept: {
    label: "Concept",
    icon: Layers,
    iconBg: "bg-blue-500/15 border-blue-500/25 text-blue-400 shadow-[0_0_20px_hsl(217_91%_60%/0.25)]",
    badge: "border-blue-500/20 bg-blue-500/[0.07] text-blue-400",
    topLine: "from-blue-500/40 via-blue-500/20 to-transparent",
    hoverBorder: "hover:border-blue-500/30",
    hoverGlow: "hover:shadow-[0_0_40px_hsl(217_91%_60%/0.10)]",
  },
} satisfies Record<Resource["type"], {
  label: string;
  icon: React.ElementType;
  iconBg: string;
  badge: string;
  topLine: string;
  hoverBorder: string;
  hoverGlow: string;
}>;

const ResourceCard = ({ resource }: { resource: Resource }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[resource.type];
  const Icon = meta.icon;
  const preview = resource.summary.slice(0, 120);
  const hasMore = resource.summary.length > 120;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-foreground/[0.07] bg-card/50 backdrop-blur-xl transition-all duration-300",
        meta.hoverBorder,
        meta.hoverGlow,
        "hover:-translate-y-0.5",
      )}
    >
      {/* Top accent gradient line */}
      <div className={cn("h-px w-full bg-gradient-to-r", meta.topLine)} />

      {/* Radial glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.05),transparent_55%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative p-5">
        {/* Header row */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-shadow duration-300", meta.iconBg, "group-hover:shadow-[0_0_28px_hsl(var(--primary)/0.3)]")}>
            <Icon className="h-4 w-4" />
          </div>
          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest", meta.badge)}>
            {meta.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-sm font-semibold leading-snug text-foreground">
          {resource.title}
        </h3>

        {/* Summary */}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {expanded || !hasMore ? resource.summary : `${preview}…`}
        </p>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-foreground/[0.05] pt-3">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
            <Clock className="h-3 w-3" />
            {resource.duration}
          </span>
          {hasMore && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-0.5 text-[10px] font-semibold text-primary/60 transition-colors hover:text-primary"
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
  );
};

const DimensionResources = ({ breakdown, maxDimensions = 2 }: Props) => {
  const sections = getResourcesForWeakDimensions(breakdown, maxDimensions);

  if (sections.length === 0) return null;

  const totalResources = sections.reduce((acc, s) => acc + Math.min(s.resources.length, 3), 0);

  return (
    <div className="mb-8">
      {/* Premium section header */}
      <div className="relative mb-10 overflow-hidden rounded-2xl border border-foreground/[0.07] bg-card/40 p-5 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/15 shadow-[0_0_24px_hsl(var(--primary)/0.3)]">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Ressources pour progresser</h2>
              <p className="text-xs text-muted-foreground/60">Ciblées sur tes points faibles · lecture courte</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[11px] font-semibold text-primary">{totalResources} ressources</span>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sections.map(({ dimension, resources }) => (
          <div key={dimension}>
            {/* Dimension label */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                {dimension}
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-border/60 to-transparent" />
            </div>

            {/* 2-column grid */}
            <div className="grid gap-3 sm:grid-cols-2">
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
