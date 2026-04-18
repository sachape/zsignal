import { Link } from "react-router-dom";
import { Users, ArrowRight, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CompetitorMatch } from "@/types/analysis";

interface Props {
  competitor: CompetitorMatch;
  /** Headline reason: short editorial sentence at the top. */
  headline?: string;
  /** What the user could realistically copy from them. */
  copyMechanic?: string;
  /** Group label rendered as badge ("Direct", "À rattraper", "Inspiration"). */
  groupLabel?: string;
}

const StreamerBenchmarkCard = ({ competitor, headline, copyMechanic, groupLabel }: Props) => {
  const isLive = (competitor.avg_viewers ?? 0) > 0;
  const isPotential = competitor.is_potential === true && competitor.group === "direct";
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
            <Users className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {competitor.display_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">@{competitor.competitor_login}</p>
          </div>
          {groupLabel && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {isPotential ? "Direct potentiel" : groupLabel}
            </Badge>
          )}
        </div>

        {isPotential && (
          <div className="rounded-md border border-warning/30 bg-warning/5 px-2.5 py-1.5 text-[11px] text-warning">
            Match direct à confirmer · signal correct mais incomplet
          </div>
        )}

        {isLive && (
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
            <Radio className="h-2.5 w-2.5" /> Live · {competitor.avg_viewers}
          </div>
        )}

        {headline && <p className="text-sm text-foreground">{headline}</p>}

        {competitor.match_reasons.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pourquoi sélectionné
            </p>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {competitor.match_reasons.slice(0, 3).map((r, i) => (
                <li key={i}>· {r}</li>
              ))}
            </ul>
          </div>
        )}

        {copyMechanic && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              À copier
            </p>
            <p className="mt-0.5 text-xs text-foreground">{copyMechanic}</p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-[10px] text-muted-foreground">
            Fit {competitor.fit_score ?? competitor.similarity_score} ·
            confiance {competitor.confidence_score ?? "—"}
          </span>
          <Link
            to={`/streamer/${competitor.competitor_login}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Voir profil <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreamerBenchmarkCard;
