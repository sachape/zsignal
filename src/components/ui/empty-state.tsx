import { Link } from "react-router-dom";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
  ctaOnClick?: () => void;
  secondaryLabel?: string;
  secondaryTo?: string;
  className?: string;
}

/**
 * Premium empty state used across creation/library pages.
 * Answers: what is this page, why is it useful, what to do next.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaTo,
  ctaOnClick,
  secondaryLabel,
  secondaryTo,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        "border-dashed border-border/50 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.06),transparent_60%)] bg-card/40",
        className,
      )}
    >
      <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary-strong ring-1 ring-primary/20">
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        {(ctaLabel || secondaryLabel) && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {ctaLabel && (ctaTo ? (
              <Button asChild>
                <Link to={ctaTo}>{ctaLabel}</Link>
              </Button>
            ) : (
              <Button onClick={ctaOnClick}>{ctaLabel}</Button>
            ))}
            {secondaryLabel && secondaryTo && (
              <Button asChild variant="ghost" size="sm">
                <Link to={secondaryTo}>{secondaryLabel}</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EmptyState;
