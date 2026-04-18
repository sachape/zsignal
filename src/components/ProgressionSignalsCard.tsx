import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProgressionSignal, SignalDirection } from "@/services/progressionSignals";

interface Props {
  signals: ProgressionSignal[];
}

const iconFor = (d: SignalDirection) => {
  switch (d) {
    case "improved":
      return TrendingUp;
    case "declined":
      return TrendingDown;
    case "blocked":
      return AlertCircle;
    default:
      return Minus;
  }
};

const colorFor = (d: SignalDirection) => {
  switch (d) {
    case "improved":
      return "text-success";
    case "declined":
      return "text-destructive";
    case "blocked":
      return "text-warning";
    default:
      return "text-muted-foreground";
  }
};

const ProgressionSignalsCard = ({ signals }: Props) => {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Ce qui a changé</h3>
        <ul className="space-y-2.5">
          {signals.map((s, i) => {
            const Icon = iconFor(s.direction);
            return (
              <li key={i} className="flex items-start gap-2.5">
                <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", colorFor(s.direction))} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default ProgressionSignalsCard;
