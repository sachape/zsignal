import { motion } from "framer-motion";
import { ShieldCheck, EyeOff, Settings, BarChart3, Users, CalendarCheck, Zap } from "lucide-react";
import AppShell from "@/components/AppShell";
import TrustCard from "@/components/TrustCard";
import SectionHeader from "@/components/SectionHeader";
import ValueCard from "@/components/ValueCard";

const ConnectTwitchPage = () => {
  return (
    <AppShell>
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">Connect Twitch</h1>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Unlock deeper analysis, personalized recommendations, and weekly progress tracking by connecting your Twitch account.
          </p>
        </motion.div>

        {/* What you unlock */}
        <div className="mt-14">
          <SectionHeader label="What you unlock" title="Go beyond surface-level insights" />
          <div className="grid gap-5 sm:grid-cols-3">
            <ValueCard
              icon={BarChart3}
              title="Full StreamScore"
              description="Get a detailed breakdown of your channel health across 8 metrics."
            />
            <ValueCard
              icon={Users}
              title="All Competitors"
              description="See all relevant competitors, not just the top match."
            />
            <ValueCard
              icon={CalendarCheck}
              title="Weekly Plan"
              description="Receive a personalized action plan each week based on your latest data."
            />
          </div>
        </div>

        {/* Trust */}
        <div className="mt-14">
          <SectionHeader label="Privacy" title="What we do — and don't do" />
          <div className="grid gap-4 sm:grid-cols-3">
            <TrustCard
              icon={EyeOff}
              title="We never post"
              description="We will never send messages, follow, or interact on your behalf."
            />
            <TrustCard
              icon={Settings}
              title="No settings changes"
              description="We never touch your stream configuration, title, or category."
            />
            <TrustCard
              icon={ShieldCheck}
              title="Read-only access"
              description="We only read publicly available data plus your stream analytics."
            />
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-14 rounded-xl border border-border bg-card p-8 text-center"
        >
          <h3 className="text-xl font-bold text-foreground">Ready to unlock your growth?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            It takes 10 seconds. You can disconnect at any time.
          </p>
          <button className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#9146FF] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
            </svg>
            Connect with Twitch
          </button>
        </motion.div>
      </div>
    </AppShell>
  );
};

export default ConnectTwitchPage;
