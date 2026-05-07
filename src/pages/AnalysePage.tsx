import { useEffect, useState, useRef } from "react";
import { Activity } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/StateView";
import StreamScoreEvolutionCard from "@/components/StreamScoreEvolutionCard";
import FoundationModeBanner from "@/components/FoundationModeBanner";
import MainBlockerCard from "@/components/MainBlockerCard";
import ScoreInsightCard from "@/components/ScoreInsightCard";
import WeeklySequenceCard from "@/components/WeeklySequenceCard";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import {
  getLatestReport,
  getLatestReportForPlatformUser,
  getRecentReports,
  type SavedReport,
} from "@/services/reportRepository";
import { getScoreTier, getTierTheme, buildScoreNarrative } from "@/services/streamScoreTier";
import { diagnoseFoundationMode } from "@/services/foundationMode";

const AnalysePage = () => {
  const { user } = useAuth();
  const { account } = useTwitchConnection();
  const [currentReport, setCurrentReport] = useState<SavedReport | null>(null);
  const [previous, setPrevious] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [ringMounted, setRingMounted] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const platformUserId = account?.platform_user_id ?? null;
      const [report, recent] = await Promise.all([
        platformUserId
          ? getLatestReportForPlatformUser(user.id, platformUserId)
          : getLatestReport(user.id),
        getRecentReports(user.id, 2),
      ]);
      if (!mountedRef.current) return;
      setCurrentReport(report);
      if (report) {
        const prev = recent.find((r) => r.id !== report.id) ?? null;
        setPrevious(prev);
      }
      setLoading(false);
    })();
  }, [user, account?.platform_user_id]);

  // Ring mount animation
  useEffect(() => {
    if (!currentReport) return;
    setRingMounted(false);
    setDisplayScore(0);
    const id = requestAnimationFrame(() => setRingMounted(true));
    return () => cancelAnimationFrame(id);
  }, [currentReport?.id]);

  // Count-up animation
  useEffect(() => {
    if (!ringMounted) return;
    const target = currentReport?.report?.score?.overall ?? 0;
    if (target === 0) return;
    const duration = 1400;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    const rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [ringMounted, currentReport?.report?.score?.overall]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (!currentReport) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <PageHeader eyebrow="Analyse" title="Analyse" description="Lance une analyse pour voir ton diagnostic complet." />
          <div className="rounded-xl border border-border/60 bg-card/40 p-8 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucune analyse disponible. Lance une analyse depuis la landing pour commencer.</p>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  const report = currentReport.report;
  const score = report.score;
  const delta = previous ? score.overall - previous.report.score.overall : null;
  const tier = getScoreTier(score.overall);
  const theme = getTierTheme(tier);
  const narrative = buildScoreNarrative(score);
  const foundation = diagnoseFoundationMode(report);
  const foundationActive = foundation.isActive && !currentReport.is_demo;

  const ringRadius = 65;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = (score.overall / 100) * ringCircumference;
  const strokeColor = `hsl(${theme.strokeVar})`;

  return (
    <AppShell>
      <PageContainer size="sm">
        <PageHeader
          eyebrow="StreamScore"
          title="Analyse"
          description="Diagnostic complet de ta chaîne et évolution de tes scores."
        />

        {/* Score bento */}
        <div className="mb-6 grid gap-4 md:grid-cols-[220px_1fr]">
          {/* Ring column */}
          <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-5 backdrop-blur-xl">
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-[1400ms] ease-out"
              style={{
                background: `radial-gradient(circle at 50% 20%, hsl(${theme.strokeVar} / 0.30), transparent 68%)`,
                opacity: ringMounted ? 1 : 0,
              }}
              aria-hidden
            />

            <div className="relative h-40 w-40">
              <svg
                viewBox="0 0 160 160"
                className="h-full w-full -rotate-90"
                aria-label={`StreamScore ${score.overall} sur 100`}
              >
                <circle cx="80" cy="80" r={ringRadius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="80" cy="80" r={ringRadius}
                  fill="none" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  style={{
                    stroke: strokeColor,
                    strokeDashoffset: ringMounted ? ringCircumference - ringProgress : ringCircumference,
                    transition: ringMounted ? "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)" : "none",
                    filter: `drop-shadow(0 0 8px ${strokeColor})`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold tabular-nums tracking-tight ${theme.textClass}`}>
                  {displayScore}
                </span>
                <span className="mt-0.5 text-[11px] text-muted-foreground">/ 100</span>
              </div>
            </div>

            <div className={`relative mt-3 rounded-full border px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider ${theme.surfaceClass}`}>
              {theme.label}
            </div>

            {delta !== null && (
              <p className={`relative mt-2 text-xs font-semibold ${delta > 0 ? "text-primary" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {delta > 0 ? `↑ +${delta} pts` : delta < 0 ? `↓ ${delta} pts` : "→ Stable"}
              </p>
            )}

            {/* Full dimension breakdown */}
            {narrative.miniBreakdown.length > 0 && (
              <div className="relative mt-5 w-full space-y-3">
                {narrative.miniBreakdown.map((dim) => {
                  const dimTheme = getTierTheme(dim.tier);
                  return (
                    <div key={dim.label}>
                      <div className="mb-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">{dim.label}</span>
                        <span className={`font-semibold ${dimTheme.textClass}`}>{dim.score}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${dimTheme.progressClass}`}
                          style={{ width: ringMounted ? `${dim.score}%` : "0%" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-3">
            {foundationActive ? (
              <>
                <FoundationModeBanner reasons={foundation.reasons} />
                <MainBlockerCard blocker={foundation.blocker} />
              </>
            ) : (
              score.breakdown.length > 0 && <ScoreInsightCard score={score} compact />
            )}
          </div>
        </div>

        {/* Score evolution */}
        {!currentReport.is_demo && (
          <StreamScoreEvolutionCard userId={user!.id} />
        )}

        {/* Foundation sequence */}
        {foundationActive && (
          <WeeklySequenceCard actions={foundation.sequence} showPlanLink={false} />
        )}
      </PageContainer>
    </AppShell>
  );
};

export default AnalysePage;
