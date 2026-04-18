import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type SyncState =
  | "no_analysis"
  | "first_analysis_in_progress"
  | "synchronized"
  | "update_in_progress"
  | "partial_refresh"
  | "refresh_failed";

interface Props {
  state: SyncState;
  lastUpdatedLabel?: string | null;
  nextSyncLabel?: string | null;
  onManualRefresh?: () => void;
  manualHref?: string;
  manualBusy?: boolean;
}

const formatRelative = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (days >= 1) return `il y a ${days} j`;
  if (hours >= 1) return `il y a ${hours} h`;
  return "à l'instant";
};

export const formatSyncRelative = formatRelative;

const STATE_META: Record<
  SyncState,
  { icon: typeof CheckCircle2; iconClass: string; title: string; tone: string }
> = {
  no_analysis: {
    icon: Clock,
    iconClass: "text-muted-foreground",
    title: "Aucune analyse pour le moment",
    tone: "border-border",
  },
  first_analysis_in_progress: {
    icon: Loader2,
    iconClass: "text-primary animate-spin",
    title: "Première analyse en cours",
    tone: "border-primary/30 bg-primary/5",
  },
  synchronized: {
    icon: CheckCircle2,
    iconClass: "text-success",
    title: "Synchronisé",
    tone: "border-border",
  },
  update_in_progress: {
    icon: Loader2,
    iconClass: "text-primary animate-spin",
    title: "Mise à jour en cours",
    tone: "border-primary/30 bg-primary/5",
  },
  partial_refresh: {
    icon: AlertCircle,
    iconClass: "text-warning",
    title: "Données partielles",
    tone: "border-warning/30 bg-warning/5",
  },
  refresh_failed: {
    icon: AlertCircle,
    iconClass: "text-destructive",
    title: "Échec de la dernière synchronisation",
    tone: "border-destructive/30 bg-destructive/5",
  },
};

const SyncStatusCard = ({
  state,
  lastUpdatedLabel,
  nextSyncLabel,
  onManualRefresh,
  manualHref,
  manualBusy,
}: Props) => {
  const meta = STATE_META[state];
  const Icon = meta.icon;

  const showManual =
    state === "synchronized" ||
    state === "partial_refresh" ||
    state === "refresh_failed" ||
    state === "no_analysis";

  return (
    <Card className={meta.tone}>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-4 w-4 shrink-0 ${meta.iconClass}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{meta.title}</p>
          <p className="text-xs text-muted-foreground">
            {lastUpdatedLabel && <>Dernière mise à jour : {lastUpdatedLabel}</>}
            {lastUpdatedLabel && (nextSyncLabel || state === "synchronized") && " · "}
            {state === "synchronized" && !nextSyncLabel && "Les prochaines mises à jour seront automatisées"}
            {nextSyncLabel && <>Prochaine synchronisation : {nextSyncLabel}</>}
          </p>
        </div>
        {showManual && (manualHref || onManualRefresh) && (
          <Button
            asChild={!!manualHref}
            variant="ghost"
            size="sm"
            disabled={manualBusy}
            onClick={onManualRefresh}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {manualHref ? (
              <Link to={manualHref}>
                <RefreshCw className="h-3.5 w-3.5" /> Actualiser maintenant
              </Link>
            ) : (
              <>
                <RefreshCw className={`h-3.5 w-3.5 ${manualBusy ? "animate-spin" : ""}`} />{" "}
                {manualBusy ? "Mise à jour…" : "Actualiser maintenant"}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SyncStatusCard;
