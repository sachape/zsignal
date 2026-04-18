import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import WeeklyPlanCard from "@/components/WeeklyPlanCard";
import EmptyReportState from "@/components/EmptyReportState";
import { LoadingState } from "@/components/StateView";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
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
          description="Trois actions, un test, une chose à éviter. Coche au fur et à mesure."
        />
        <WeeklyPlanCard report={report.report} />
      </PageContainer>
    </AppShell>
  );
};

export default WeeklyPlanPage;
