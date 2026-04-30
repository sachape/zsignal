import { cn } from "@/lib/utils";
import { getScoreTier, getTierTheme } from "@/services/streamScoreTier";

interface Props {
  label: string;
  value: string;
  pct: number;
  /** When true, fill color follows the StreamScore tier system. */
  tinted?: boolean;
}

/**
 * Standardized labeled progress row used for affiliate progress
 * and any "current / target" KPI bar across the app.
 *
 * When `tinted` is true, the fill color follows the StreamScore tier
 * thresholds (low/mid/high) so the row visually matches the score signal.
 */
const ProgressRow = ({ label, value, pct, tinted = false }: Props) => {
  const theme = tinted ? getTierTheme(getScoreTier(pct)) : null;
  const fillClass = theme ? theme.progressClass : "bg-primary";
  const valueClass = theme ? theme.textClass : "text-foreground";

  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={cn("font-medium", valueClass)}>{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all duration-500", fillClass)}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressRow;
