import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import WeeklyPlanCard from "@/components/WeeklyPlanCard";
import MainBlockerCard from "@/components/MainBlockerCard";
import EmptyReportState from "@/components/EmptyReportState";
import { LoadingState } from "@/components/StateView";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { diagnoseFoundationMode } from "@/services/foundationMode";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  type SavedReport,
} from "@/services/reportRepository";

const WeeklyPlanPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { account, loading: connectionLoading } = useTwitchConnection();
  const [report, setReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || connectionLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const r = account?.platform_user_id
        ? await getLatestReportForPlatformUser(user.id, account.platform_user_id)
        : await getLatestReport(user.id);
      if (!cancelled) {
        setReport(r);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, account, authLoading, connectionLoading]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <EmptyReportState
            title="Pas encore de plan"
            description="Lance une analyse pour générer ton plan d'action de la semaine."
          />
        </PageContainer>
      </AppShell>
    );
  }

  // Surface the foundation blocker at the top so the plan reads as the
  // execution surface of the diagnosis, not a parallel module.
  const foundation = diagnoseFoundationMode(report.report);
  const foundationActive = foundation.isActive && !report.is_demo;

  return (
    <AppShell>
      <PageContainer size="sm">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" /> Tableau de bord
          </Link>
        </Button>
        <PageHeader
          eyebrow="Coaching"
          title="Plan de la semaine"
          description="Étape 1, 2, 3, un test et une chose à éviter. Coche au fur et à mesure."
          action={
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to={`/result?report_id=${report.id}`}>
                <FileText className="h-3.5 w-3.5" /> Diagnostic complet
              </Link>
            </Button>
          }
        />
        {foundationActive && (
          <MainBlockerCard blocker={foundation.blocker} reportId={report.id} />
        )}
        <WeeklyPlanCard report={report.report} />
      </PageContainer>
    </AppShell>
  );
};

export default WeeklyPlanPage;
