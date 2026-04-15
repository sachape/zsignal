interface ScoreCardProps {
  score?: number;
  label?: string;
  locked?: boolean;
}

const ScoreCard = ({ score = 62, label = "StreamScore", locked }: ScoreCardProps) => {
  const circumference = 2 * Math.PI * 42;
  const progress = locked ? 0 : (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6">
      <div className="relative h-28 w-28">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(217 91% 60%)" />
              <stop offset="100%" stopColor="hsl(172 66% 50%)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{locked ? "?" : score}</span>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">out of 100</p>
    </div>
  );
};

export default ScoreCard;
