import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisStepProps {
  label: string;
  status: "pending" | "active" | "done";
  index?: number;
}

const AnalysisStep = ({ label, status }: AnalysisStepProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm transition-colors",
        status === "active" && "border-primary/40 bg-primary/5",
        status === "done" && "border-border/60 text-muted-foreground",
        status === "pending" && "border-border/60",
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {status === "done" && <Check className="h-3.5 w-3.5 text-primary-strong" />}
        {status === "active" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-strong" />
        )}
        {status === "pending" && (
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        )}
      </span>
      <span
        className={cn(
          status === "active"
            ? "font-medium text-foreground"
            : "text-foreground/80",
        )}
      >
        {label}
      </span>
    </div>
  );
};

export default AnalysisStep;
