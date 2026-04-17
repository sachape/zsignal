import { Link } from "react-router-dom";
import { Clock, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SavedReport } from "@/services/reportRepository";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ReportHistoryList = ({ reports }: { reports: SavedReport[] }) => {
  if (!reports.length) {
    return (
      <p className="text-sm text-muted-foreground">Aucune analyse précédente.</p>
    );
  }

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border">
        {reports.map((r) => (
          <li key={r.id}>
            <Link
              to={`/result?report_id=${r.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {r.report.channel_summary.display_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="muted">Score {r.report.score.overall}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default ReportHistoryList;
