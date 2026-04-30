import { Card, CardContent } from "@/components/ui/card";
import { getScoreTier, getTierTheme } from "@/services/streamScoreTier";

interface ScoreCardProps {
  score?: number;
  label?: string;
  locked?: boolean;
}

const ScoreCard = ({ score = 62, label = "StreamScore", locked }: ScoreCardProps) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = locked ? 0 : (score / 100) * circumference;

  const tier = getScoreTier(score);
  const theme = getTierTheme(tier);
  // Locked → neutral (muted) so the unknown state never reads as a tier signal.
  const strokeColor = locked ? "hsl(var(--muted-foreground))" : `hsl(${theme.strokeVar})`;
  const numberClass = locked ? "text-foreground" : theme.textClass;

  return (
    <Card>
      <CardContent className="flex flex-col items-center p-5">
        <div className="relative h-24 w-24">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-semibold tracking-tight ${numberClass}`}>
              {locked ? "?" : score}
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {locked ? "sur 100" : `${theme.label} · sur 100`}
        </p>
      </CardContent>
    </Card>
  );
};

export default ScoreCard;
