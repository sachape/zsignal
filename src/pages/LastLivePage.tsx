import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Radio, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/StateView";
import { useAuth } from "@/contexts/AuthContext";
import {
  getLiveCockpitSnapshot,
  formatLiveDateTime,
  formatLiveDuration,
  type LiveDebrief,
  type LiveSession,
} from "@/services/liveSessions";

const SubScore = ({ label, value }: { label: string; value: number | null }) => (
  <div className="rounded-lg border border-border/60 bg-card/40 p-3">
    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
      {label}
    </p>
    <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
      {value ?? "—"}
      {value !== null && (
        <span className="ml-1 text-xs font-normal text-muted-foreground">/100</span>
      )}
    </p>
  </div>
);

const DeltaPill = ({
  label,
  delta,
  unit,
  positiveIsGood = true,
}: {
  label: string;
  delta: number | undefined;
  unit: string;
  positiveIsGood?: boolean;
}) => {
  if (typeof delta !== "number") return null;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const tone =
    delta === 0
      ? "text-muted-foreground"
      : (delta > 0 && positiveIsGood) || (delta < 0 && !positiveIsGood)
        ? "text-success"
        : "text-warning";
  const sign = delta > 0 ? "+" : "";
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2">
      <Icon className={`h-4 w-4 ${tone}`} />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {label}
        </p>
        <p className={`text-sm font-semibold tabular-nums ${tone}`}>
          {sign}
          {delta} {unit}
        </p>
      </div>
    </div>
  );
};

const LastLivePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<LiveSession | null>(null);
  const [last, setLast] = useState<LiveSession | null>(null);
  const [debrief, setDebrief] = useState<LiveDebrief | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const snap = await getLiveCockpitSnapshot(user.id);
      if (cancelled) return;
      setCurrent(snap.current);
      setLast(snap.last);
      setDebrief(snap.lastDebrief);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  // Live in progress — no final score yet
  if (current && !last) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <PageHeader
            eyebrow="Dernier live"
            title="Live en cours"
            description="Le débrief sera disponible dès la fin du stream."
          />
          <Card className="border-destructive/40 bg-destructive/[0.04]">
            <CardContent className="flex items-start gap-3 p-5">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-md bg-destructive/15">
                <Radio className="h-5 w-5 text-destructive" />
                <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Session live en cours d'enregistrement
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Démarré {formatLiveDateTime(current.started_at)}
                  {current.category_name ? ` · ${current.category_name}` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  // No live ever
  if (!last) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <PageHeader
            eyebrow="Dernier live"
            title="Aucun live détecté pour le moment"
            description="Dès que tu lances un stream, un débrief sera généré automatiquement à la fin."
          />
          <Card className="border-border/60 bg-card/60">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                StreamPulse écoute Twitch toutes les quelques minutes pour
                détecter automatiquement tes streams.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour au cockpit
                </Link>
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  const score = debrief?.overall_score ?? null;
  const enough = debrief?.has_enough_signal ?? false;
  const cmp = debrief?.comparison_data ?? null;

  return (
    <AppShell>
      <PageContainer size="sm">
        <PageHeader
          eyebrow="Dernier live"
          title={`Débrief du ${formatLiveDateTime(last.started_at)}`}
          description={`${formatLiveDuration(last.duration_minutes)}${
            last.category_name ? ` · ${last.category_name}` : ""
          }`}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" />
                Cockpit
              </Link>
            </Button>
          }
        />

        {/* Score header */}
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                <span className="text-2xl font-semibold text-primary tabular-nums">
                  {score ?? "—"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Score du live
                </p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {debrief?.verdict ?? "Pas encore assez de signal sur ce live."}
                </p>
              </div>
            </div>
            {!enough && (
              <Badge variant="muted" className="self-start sm:self-auto">
                Signal limité
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Sub-scores */}
        {enough && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            <SubScore label="Démarrage" value={debrief?.score_start ?? null} />
            <SubScore label="Tenue" value={debrief?.score_hold ?? null} />
            <SubScore label="Structure" value={debrief?.score_structure ?? null} />
          </div>
        )}

        {/* Summary / strength / weakness / action */}
        <div className="mb-4 space-y-3">
          {debrief?.summary && (
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Résumé du live
                </p>
                <p className="mt-1 text-sm text-foreground">{debrief.summary}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-success">
                Ton point fort sur ce live
              </p>
              <p className="mt-1 text-sm text-foreground">
                {debrief?.main_strength ?? debrief?.strength ?? "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-warning">
                Ton principal point faible
              </p>
              <p className="mt-1 text-sm text-foreground">
                {debrief?.main_weakness ?? debrief?.weakness ?? "—"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/[0.04]">
            <CardContent className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">
                Action prioritaire pour le prochain stream
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {debrief?.priority_action ?? "—"}
              </p>
            </CardContent>
          </Card>

          {debrief?.next_live_focus && (
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Focus pour ton prochain live
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {debrief.next_live_focus}
                </p>
              </CardContent>
            </Card>
          )}

          {(debrief?.confidence || debrief?.signal_quality) && (
            <p className="text-[11px] text-muted-foreground/80">
              {debrief?.confidence === "high"
                ? "Analyse fiable, basée sur plusieurs signaux."
                : debrief?.confidence === "medium"
                ? "Analyse correcte, mais à confirmer sur les prochains lives."
                : "Analyse limitée — lance un live plus long pour obtenir une lecture plus fiable."}
            </p>
          )}
        </div>

        {/* Comparison vs previous */}
        {cmp?.has_previous && (
          <Card>
            <CardContent className="p-4">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Comparaison avec ton live précédent
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <DeltaPill
                  label="Durée"
                  delta={cmp.duration_delta_min}
                  unit="min"
                />
                <DeltaPill
                  label="Pic viewers"
                  delta={cmp.peak_delta}
                  unit=""
                />
                <DeltaPill
                  label="Viewers moyens"
                  delta={cmp.avg_delta}
                  unit=""
                />
              </div>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default LastLivePage;
