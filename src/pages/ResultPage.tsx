import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { User, TrendingDown, Clock, Target, Lightbulb, Lock } from "lucide-react";
import AppShell from "@/components/AppShell";
import ScoreCard from "@/components/ScoreCard";
import CompetitorCard from "@/components/CompetitorCard";
import RecommendationCard from "@/components/RecommendationCard";
import LockedOverlay from "@/components/LockedOverlay";
import StatBlock from "@/components/StatBlock";
import SectionHeader from "@/components/SectionHeader";

const ResultPage = () => {
  const [searchParams] = useSearchParams();
  const channel = searchParams.get("channel") || "your_channel";

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
            <p className="text-sm text-muted-foreground">Variety · ~45 avg viewers · Affiliate</p>
          </div>
        </motion.div>

        {/* Score + Stats */}
        <div className="mb-10 grid gap-6 sm:grid-cols-4">
          <ScoreCard score={62} />
          <div className="flex flex-col gap-3 sm:col-span-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBlock label="Avg Viewers" value="45" subtext="last 30 days" />
              <StatBlock label="Consistency" value="71%" subtext="4/7 days" />
              <StatBlock label="Engagement" value="6.2%" subtext="chat rate" accent />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-warning" />
                <p className="text-sm font-semibold text-foreground">Key Weakness: Stream Consistency</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                You streamed 4 out of 7 days last week. Irregular schedules reduce discoverability by up to 35%.
              </p>
            </div>
          </div>
        </div>

        {/* Competitor Teaser */}
        <div className="mb-10">
          <SectionHeader title="Top Competitor Match" align="left" />
          <CompetitorCard name="streamzilla_fr" followers="2.4K" similarity={87} />
          <div className="relative mt-3">
            <CompetitorCard name="" followers="" similarity={0} locked />
            <LockedOverlay message="Connect Twitch to see more competitors" cta="Unlock Competitors" />
          </div>
        </div>

        {/* Affiliate Progress */}
        <div className="relative mb-10 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Affiliate Progress
          </h3>
          <div className="space-y-3">
            {[
              { label: "Avg Viewers", value: "2.8 / 3", pct: 93 },
              { label: "Stream Days", value: "6 / 7", pct: 86 },
              { label: "Unique Chatters", value: "42 / 50", pct: 84 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.label}</span>
                  <span className="text-foreground">{item.value}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full gradient-primary"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="mb-10">
          <SectionHeader title="Recommended Actions" align="left" />
          <div className="grid gap-4 sm:grid-cols-3">
            <RecommendationCard
              icon={Clock}
              title="Fix your schedule"
              description="Stream at least 5 days this week, ideally at the same time. Consistency is the #1 growth lever."
            />
            <RecommendationCard
              icon={Target}
              title="Optimize your title format"
              description="Use keyword-rich titles with brackets. Example: [FR] Ranked Climb → Diamond"
              locked
            />
            <RecommendationCard
              icon={Lightbulb}
              title="Raid a similar streamer"
              description="After each stream, raid one of your top competitor matches to build network effects."
              locked
            />
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
          <h3 className="text-xl font-bold text-foreground">Want the full picture?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Connect your Twitch account to unlock all competitors, personalized recommendations, and weekly progress tracking.
          </p>
          <a
            href="/connect-twitch"
            className="mt-5 inline-flex items-center gap-2 rounded-lg gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Connect Twitch
          </a>
        </motion.div>
      </div>
    </AppShell>
  );
};

export default ResultPage;
