import { Link } from "react-router-dom";
import { Clock, ChevronRight } from "lucide-react";
import type { SavedReport } from "@/services/reportRepository";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const ReportHistoryList = ({ reports }: { reports: SavedReport[] }) => {
  if (!reports.length) {
    return (
      <p className="text-sm text-muted-foreground">Aucune analyse précédente.</p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {reports.map((r) => (
        <li key={r.id}>
          <Link
            to={`/result?report_id=${r.id}`}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {r.report.channel_summary.display_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(r.created_at)} · Score {r.report.score.overall}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default ReportHistoryList;
