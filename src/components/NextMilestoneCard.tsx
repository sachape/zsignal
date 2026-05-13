import { Link } from "react-router-dom";
import { ArrowRight, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProgressRow from "@/components/ProgressRow";
import { formatNumber } from "@/lib/format";

interface Milestone {
  label: string;
  current: number;
  target: number;
  pct: number;
}

interface Props {
  milestone: Milestone;
  reportId: string;
  /**
   * When true (foundation mode), the milestone is reframed as a stability
   * objective rather than a performance one. Copy emphasizes that creating
   * a readable signal comes before optimizing further.
   */
  foundationActive?: boolean;
}

const NextMilestoneCard = ({ milestone, reportId, foundationActive }: Props) => {
  const remaining = Math.max(0, milestone.target - milestone.current);

  // Headline reframes the milestone as a near-term objective, not a bar.
  const headline = foundationActive
    ? "Ton prochain objectif n'est pas la performance, c'est la stabilité"
    : remaining > 0
      ? `Encore ${formatNumber(remaining)} ${milestone.label.toLowerCase()} pour le prochain palier`
      : `Palier ${milestone.label.toLowerCase()} atteint`;

  const rationale = foundationActive
    ? "Tu dois d'abord créer un rythme lisible avant d'optimiser plus loin. Ce palier reste indicatif tant que la base n'est pas posée."
    : "Concentre-toi sur ce palier cette semaine. C'est le levier le plus proche d'être débloqué.";

  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 text-[10px] text-primary">
                <Target className="h-3 w-3" />
                Prochain objectif
              </Badge>
              <span className="text-xs text-muted-foreground">{milestone.label}</span>
            </div>
            <h3 className="mt-1.5 text-sm font-semibold text-foreground">
              {headline}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{rationale}</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/progression">
              Détail <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <ProgressRow
          label={milestone.label}
          value={`${formatNumber(milestone.current)} / ${formatNumber(milestone.target)}`}
          pct={milestone.pct}
        />
      </CardContent>
    </Card>
  );
};

export default NextMilestoneCard;
