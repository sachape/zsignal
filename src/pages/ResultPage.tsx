import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { User, TrendingDown, Clock, Target, Lightbulb, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import ScoreCard from "@/components/ScoreCard";
import CompetitorCard from "@/components/CompetitorCard";
import RecommendationCard from "@/components/RecommendationCard";
import LockedOverlay from "@/components/LockedOverlay";
import StatBlock from "@/components/StatBlock";
import SectionHeader from "@/components/SectionHeader";
import { mockAnalysisReport } from "@/data/mockAnalysis";

const iconMap: Record<string, typeof Clock> = {
  regularity: Clock,
  discoverability: Target,
  community: Lightbulb,
};

const ResultPage = () => {
  const [searchParams] = useSearchParams();
  const channel = searchParams.get("channel") || mockAnalysisReport.channel_summary.channel_name;
  const { user } = useAuth();
  const ctaLink = user ? "/connect-twitch" : "/auth?redirect=/connect-twitch";

  const report = mockAnalysisReport;
  const summary = report.channel_summary;
  const score = report.score;
  const ap = report.affiliate_progress;

  return (
    <AppShell>
      <div className="container mx-auto max-w-4xl px-4 py-10">
        {/* Channel Identity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-center gap-4 rounded-xl border border-border bg-card p-6"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{channel}</h1>
            <p className="text-sm text-muted-foreground">
              {summary.category} · ~{summary.avg_viewers} viewers moyens · {summary.broadcaster_type === "affiliate" ? "Affilié" : summary.broadcaster_type}
            </p>
          </div>
        </motion.div>

        {/* Score + Stats */}
        <div className="mb-10 grid gap-6 sm:grid-cols-4">
          <ScoreCard score={score.overall_score} />
          <div className="flex flex-col gap-3 sm:col-span-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBlock label="Viewers moyens" value={String(summary.avg_viewers)} subtext="30 derniers jours" />
              <StatBlock label="Régularité" value={`${score.regularity}%`} subtext={`${ap.stream_days.current}/${ap.stream_days.target} jours`} />
              <StatBlock label="Engagement" value={`${(score.engagement / 10).toFixed(1)}%`} subtext="taux de chat" accent />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-warning" />
                <p className="text-sm font-semibold text-foreground">Point faible clé : {report.weak_point.label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{report.weak_point.description}</p>
            </div>
          </div>
        </div>

        {/* Competitor Teaser */}
        <div className="mb-10">
          <SectionHeader title="Meilleur concurrent similaire" align="left" />
          {report.competitors[0] && (
            <CompetitorCard
              name={report.competitors[0].competitor_login}
              followers={`${(report.competitors[0].follower_count / 1000).toFixed(1)}K`}
              similarity={report.competitors[0].similarity_score}
            />
          )}
          <div className="relative mt-3">
            <CompetitorCard name="" followers="" similarity={0} locked />
            <LockedOverlay message="Connecte Twitch pour voir plus de concurrents" cta="Débloquer" />
          </div>
        </div>

        {/* Affiliate Progress */}
        <div className="relative mb-10 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Progression vers l'affiliation
          </h3>
          <div className="space-y-3">
            {[
              { label: "Viewers moyens", value: `${ap.avg_viewers.current} / ${ap.avg_viewers.target}`, pct: Math.round((ap.avg_viewers.current / ap.avg_viewers.target) * 100) },
              { label: "Jours de stream", value: `${ap.stream_days.current} / ${ap.stream_days.target}`, pct: Math.round((ap.stream_days.current / ap.stream_days.target) * 100) },
              { label: "Chatteurs uniques", value: `${ap.unique_chatters.current} / ${ap.unique_chatters.target}`, pct: Math.round((ap.unique_chatters.current / ap.unique_chatters.target) * 100) },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.label}</span>
                  <span className="text-foreground">{item.value}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full gradient-primary" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="mb-10">
          <SectionHeader title="Actions recommandées" align="left" />
          <div className="grid gap-4 sm:grid-cols-3">
            {report.recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                icon={iconMap[rec.category] || Clock}
                title={rec.title}
                description={rec.description}
                locked={rec.is_locked}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center"
        >
          <Lock className="mx-auto mb-3 h-6 w-6 text-primary" />
          <h3 className="text-xl font-bold text-foreground">Tu veux l'analyse complète ?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Connecte ton compte Twitch pour débloquer tous les concurrents, des recommandations personnalisées et un suivi hebdomadaire de ta progression.
          </p>
          <a
            href={ctaLink}
            className="mt-5 inline-flex items-center gap-2 rounded-lg gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {user ? "Connecter Twitch" : "Créer un compte gratuit"}
          </a>
        </motion.div>
      </div>
    </AppShell>
  );
};

export default ResultPage;
