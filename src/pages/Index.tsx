import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowRight, BarChart3, Users, CalendarCheck, ShieldCheck, EyeOff, Settings } from "lucide-react";
import LandingNav from "@/components/LandingNav";
import SectionHeader from "@/components/SectionHeader";
import ValueCard from "@/components/ValueCard";
import TrustCard from "@/components/TrustCard";
import ScoreCard from "@/components/ScoreCard";
import CompetitorCard from "@/components/CompetitorCard";

const Index = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleAnalyze = () => {
    if (username.trim()) {
      navigate(`/analyze?channel=${encodeURIComponent(username.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(217_91%_60%/0.08),transparent_60%)]" />
        <div className="container relative mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              Streamer Growth Copilot
            </span>
            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Know exactly why your channel{" "}
              <span className="gradient-primary-text">isn't growing</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Get your StreamScore, find relevant competitors, and receive a clear weekly action plan — in under 60 seconds.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-10 max-w-lg"
          >
            <div className="flex gap-2 rounded-xl border border-border bg-card p-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Twitch username or channel URL"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="w-full bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <button
                onClick={handleAnalyze}
                className="flex shrink-0 items-center gap-2 rounded-lg gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Analyze
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => navigate("/connect-twitch")}
              className="mt-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Or connect Twitch for deeper analysis →
            </button>
          </motion.div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeader
            label="What you get"
            title="Clarity in 3 steps"
            description="No guesswork. StreamPulse gives you structured, actionable insights about your Twitch channel."
          />
          <div className="grid gap-6 sm:grid-cols-3">
            <ValueCard
              icon={BarChart3}
              title="StreamScore"
              description="A single number that captures your channel health — stream quality, consistency, engagement, and growth velocity."
            />
            <ValueCard
              icon={Users}
              title="Relevant Competitors"
              description="Find streamers at your level who are growing faster. Learn what they do differently so you can close the gap."
            />
            <ValueCard
              icon={CalendarCheck}
              title="Weekly Action Plan"
              description="Three clear actions per week, prioritized by impact. No vague advice — concrete steps you can act on today."
            />
          </div>
        </div>
      </section>

      {/* Demo Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeader
            label="Preview"
            title="See what you'll get"
            description="Here's a glimpse of the analysis StreamPulse builds for your channel."
          />
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            <ScoreCard score={62} />
            <div className="flex flex-col gap-3">
              <CompetitorCard name="streamzilla_fr" followers="2.4K" similarity={87} />
              <CompetitorCard name="nightowl_ttv" followers="1.8K" similarity={74} />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Affiliate Progress</p>
              <div className="mt-4 space-y-3">
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
                        className="h-full rounded-full gradient-primary transition-all duration-700"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-border py-20">
        <div className="container mx-auto px-4">
          <SectionHeader
            label="Trust & Privacy"
            title="Your channel stays yours"
            description="StreamPulse never touches your stream. We only read public data to help you grow."
          />
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
            <TrustCard
              icon={EyeOff}
              title="No posting"
              description="We never post, chat, or interact on your behalf."
            />
            <TrustCard
              icon={Settings}
              title="No changes"
              description="We never modify your channel settings or stream config."
            />
            <TrustCard
              icon={ShieldCheck}
              title="Read-only analysis"
              description="We only read publicly available data to build your insights."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © 2026 StreamPulse. Built for streamers who want to grow.
        </div>
      </footer>
    </div>
  );
};

export default Index;
