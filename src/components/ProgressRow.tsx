import { Progress } from "@/components/ui/progress";

interface Props {
  label: string;
  value: string;
  pct: number;
}

/**
 * Standardized labeled progress row used for affiliate progress
 * and any "current / target" KPI bar across the app.
 */
const ProgressRow = ({ label, value, pct }: Props) => {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{value}</span>
      </div>
      <Progress value={pct} className="mt-1.5" />
    </div>
  );
};

export default ProgressRow;
