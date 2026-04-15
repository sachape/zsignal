import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

interface AnalysisStepProps {
  label: string;
  status: "pending" | "active" | "done";
  index: number;
}

const AnalysisStep = ({ label, status, index }: AnalysisStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${
        status === "active"
          ? "border-primary/40 bg-primary/5 glow-primary"
          : status === "done"
          ? "border-success/30 bg-success/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full">
        {status === "done" ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20">
            <Check className="h-4 w-4 text-success" />
          </div>
        ) : status === "active" ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <span
        className={`text-sm font-medium ${
          status === "active"
            ? "text-foreground"
            : status === "done"
            ? "text-success"
            : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </motion.div>
  );
};

export default AnalysisStep;
