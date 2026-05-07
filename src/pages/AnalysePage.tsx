import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { LoadingState } from "@/components/StateView";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
} from "@/services/reportRepository";

/**
 * Entry point for the in-app "Analyse" sidebar item.
 * Loads the latest report and redirects to ResultPage which has the full
 * diagnostic content (score ring, dimensions, recommendations, competitors…).
 * ResultPage already renders inside AppShell when the user is authenticated,
 * so the sidebar is preserved.
 */
const AnalysePage = () => {
  const { user } = useAuth();
  const { account, loading: twitchLoading } = useTwitchConnection();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user || twitchLoading) return;
    (async () => {
      const platformUserId = account?.platform_user_id ?? null;
      const report = platformUserId
        ? await getLatestReportForPlatformUser(user.id, platformUserId)
        : await getLatestReport(user.id);

      if (report) {
        navigate(`/result?report_id=${report.id}`, { replace: true });
      } else {
        setNotFound(true);
      }
    })();
  }, [user, twitchLoading, account?.platform_user_id, navigate]);

  if (notFound) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune analyse disponible. Lance une analyse depuis la page d'accueil.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <LoadingState />
    </AppShell>
  );
};

export default AnalysePage;
