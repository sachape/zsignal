import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import AnalysisStep from "@/components/AnalysisStep";

const steps = [
  "Finding your channel",
  "Reading recent streams",
  "Detecting patterns",
  "Finding comparable streamers",
  "Calculating StreamScore",
];

const AnalyzePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const channel = searchParams.get("channel") || "";
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!channel) {
      setError(true);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(() => navigate(`/result?channel=${encodeURIComponent(channel)}`), 800);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [channel, navigate]);

  const getStatus = (index: number): "pending" | "active" | "done" => {
    if (index < currentStep) return "done";
    if (index === currentStep) return "active";
    return "pending";
  };

  if (error) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Channel not found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn't find that channel. Check the username and try again.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 inline-flex items-center gap-2 rounded-lg gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </motion.div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-xl font-bold text-foreground">Analyzing {channel}</h1>
            <p className="mt-1 text-sm text-muted-foreground">This takes about 30 seconds</p>
          </motion.div>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <AnalysisStep key={step} label={step} status={getStatus(i)} index={i} />
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-8 h-1 rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full gradient-primary"
              initial={{ width: "0%" }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default AnalyzePage;
