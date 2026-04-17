import { Card, CardContent } from "@/components/ui/card";

interface ScoreCardProps {
  score?: number;
  label?: string;
  locked?: boolean;
}

const ScoreCard = ({ score = 62, label = "StreamScore", locked }: ScoreCardProps) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = locked ? 0 : (score / 100) * circumference;

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
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {locked ? "?" : score}
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">sur 100</p>
      </CardContent>
    </Card>
  );
};

export default ScoreCard;
