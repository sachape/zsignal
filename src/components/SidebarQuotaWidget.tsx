import { Link } from "react-router-dom";
import { Clapperboard, Palette } from "lucide-react";
import { useQuotaUsage } from "@/hooks/useQuotaUsage";
import { cn } from "@/lib/utils";

const QuotaRow = ({
  icon: Icon,
  label,
  used,
  limit,
}: {
  icon: typeof Palette;
  label: string;
  used: number;
  limit: number;
}) => {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const near = limit > 0 && used / limit >= 0.85;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span className={cn("tabular-nums", near ? "text-warning" : "text-muted-foreground")}>
          {used}/{limit}
        </span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn("h-full rounded-full transition-all", near ? "bg-warning" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Global monthly-usage widget in the sidebar footer. Always visible so the
 * quota feels like a real system, not buried on one page. Links to billing.
 */
const SidebarQuotaWidget = ({ collapsed }: { collapsed: boolean }) => {
  const q = useQuotaUsage();
  if (collapsed || q.loading) return null;
  return (
    <Link
      to="/billing"
      title="Tes générations ce mois-ci"
      className="mb-1 block rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 p-2.5 transition-colors hover:bg-sidebar-accent"
    >
      <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        Ce mois-ci
      </p>
      <div className="space-y-2">
        <QuotaRow icon={Palette} label="Visuels" used={q.visualsUsed} limit={q.visualsLimit} />
        <QuotaRow icon={Clapperboard} label="Clips" used={q.clipsUsed} limit={q.clipsLimit} />
      </div>
    </Link>
  );
};

export default SidebarQuotaWidget;
