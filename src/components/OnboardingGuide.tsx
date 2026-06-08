import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { analytics } from "@/services/analytics";
import { Check, ArrowRight, Tv, Sparkles, FileText, CalendarCheck, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getOnboardingState,
  markOnboardingStepVisited as dbMarkStepVisited,
  completeOnboarding as dbCompleteOnboarding,
  type OnboardingStep,
} from "@/services/onboardingState";

// Re-exports for legacy call sites (now async, DB-backed).
export async function markOnboardingStepVisited(_userId: string, step: OnboardingStep) {
  await dbMarkStepVisited(step);
}

export async function isOnboardingDone(_userId: string): Promise<boolean> {
  const state = await getOnboardingState();
  return state.is_completed;
}

interface Step {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;       // shown when done
  descriptionTodo: string;   // shown when not yet done
  cta: string;
  href: string;
  autoChecked?: boolean;
}

interface Props {
  userId: string;
  displayName: string;
  isConnected: boolean;
  hasReport: boolean;
  onComplete: () => void;
}

const SCORE_TIMEOUT_MS = 120_000; // 2 minutes

const OnboardingGuide = ({ userId, displayName, isConnected, hasReport, onComplete }: Props) => {
  const navigate = useNavigate();
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [scoreTimedOut, setScoreTimedOut] = useState(false);
  const scoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    getOnboardingState().then((state) => {
      if (!active) return;
      setVisited(new Set(state.steps_visited));
    });
    return () => {
      active = false;
    };
  }, [userId]);

  // Start/stop the score timeout when the user is waiting for their first report.
  useEffect(() => {
    if (isConnected && !hasReport) {
      scoreTimerRef.current = setTimeout(() => setScoreTimedOut(true), SCORE_TIMEOUT_MS);
    } else {
      if (scoreTimerRef.current) clearTimeout(scoreTimerRef.current);
      setScoreTimedOut(false);
    }
    return () => {
      if (scoreTimerRef.current) clearTimeout(scoreTimerRef.current);
    };
  }, [isConnected, hasReport]);

  const steps: Step[] = [
    {
      id: "twitch",
      icon: Tv,
      label: "Connecte ton compte Twitch",
      descriptionTodo: "Relie ton compte Twitch — c'est ce qui active l'analyse complète et ton cockpit personnalisé.",
      description: "Compte Twitch lié. Streamnco lit tes données en temps réel.",
      cta: "Connecter Twitch",
      href: "/connect-twitch",
      autoChecked: isConnected,
    },
    {
      id: "score",
      icon: Sparkles,
      label: "Premier StreamScore en cours…",
      descriptionTodo: "Ton score est en train d'être calculé, ça prend environ une minute. Laisse cette page ouverte.",
      description: "Ton StreamScore de départ est prêt. C'est la base de toutes tes recommandations.",
      cta: "",
      href: "",
      autoChecked: hasReport,
    },
    {
      id: "analyse",
      icon: FileText,
      label: "Comprends ce qui te freine",
      descriptionTodo: "Consulte ton analyse complète pour voir exactement ce qui limite ta progression.",
      description: "Analyse consultée — tu sais ce qui freine ta croissance.",
      cta: "Voir mon analyse",
      href: "/analyse",
    },
    {
      id: "plan",
      icon: CalendarCheck,
      label: "Prépare ta semaine",
      descriptionTodo: "Accède à ton plan pour recevoir 3 actions concrètes à appliquer cette semaine.",
      description: "Plan consulté — tu sais exactement quoi faire cette semaine.",
      cta: "Voir mon plan",
      href: "/plan",
    },
  ];

  const isStepDone = (step: Step) => {
    if (step.autoChecked !== undefined) return step.autoChecked;
    // Steps 3 & 4 require Twitch connected + report as prerequisites
    if (!isConnected || !hasReport) return false;
    return visited.has(step.id);
  };

  const allDone = steps.every(isStepDone);

  // Determine the next actionable step based on where the user actually is.
  // Step 1 (Twitch) → navigate without DB write (auto-checked by connection state)
  // Step 2 (Score) → passive wait, no action possible
  // Steps 3 & 4 → navigable + DB-marked when clicked
  const getNextActionableStep = (): Step | "waiting" | null => {
    if (!isConnected) return steps[0];
    if (!hasReport) return "waiting";
    return steps.find((s) => !isStepDone(s) && !!s.href && s.autoChecked === undefined) ?? null;
  };

  const handleStepClick = (step: Step) => {
    if (!step.href) return;
    if (step.autoChecked !== undefined) {
      // Auto-checked steps navigate but don't write to DB
      navigate(step.href);
      return;
    }
    const stepId = step.id as OnboardingStep;
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
    void dbMarkStepVisited(stepId);
    navigate(step.href);
  };

  const handleComplete = () => {
    analytics.onboardingCompleted();
    void dbCompleteOnboarding();
    onComplete();
  };

  const nextActionable = getNextActionableStep();

  return (
    <div className="mx-auto max-w-xl py-8 sm:py-14">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 shadow-[0_0_24px_hsl(var(--primary)/0.25)]">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-[28px]">
          Prêt à prendre le contrôle ?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connecte Twitch et découvre exactement ce qui freine ta croissance.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const done = isStepDone(step);
          const Icon = step.icon;
          // A step is clickable only if its prerequisites are met
          const prerequisitesMet = step.autoChecked !== undefined
            ? !!step.href                  // auto-checked steps: just need an href
            : isConnected && hasReport;    // manual steps: need Twitch + report first
          const isClickable = !done && !!step.href && prerequisitesMet;

          return (
            <div
              key={step.id}
              className={cn(
                "relative overflow-hidden rounded-2xl border transition-all duration-200",
                done
                  ? "border-primary/20 bg-primary/[0.04]"
                  : "border-border/60 bg-card/40",
                isClickable && "hover:border-primary/30 hover:bg-card/60 cursor-pointer",
              )}
              onClick={isClickable ? () => handleStepClick(step) : undefined}
            >
              <div className="flex items-start gap-4 p-4">
                {/* Step number / check / spinner */}
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all",
                  done
                    ? "border-primary/30 bg-primary/15 text-primary"
                    : "border-border/60 bg-muted/40 text-muted-foreground",
                )}>
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : step.id === "score" && isConnected ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="text-xs">{i + 1}</span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4 shrink-0", done ? "text-primary" : "text-muted-foreground")} />
                    <p className={cn(
                      "text-sm font-semibold",
                      done ? "text-foreground" : "text-foreground/80",
                    )}>
                      {step.id === "score" && done ? "Premier StreamScore calculé" : step.label}
                    </p>
                    {done && (
                      <span className="ml-auto shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Fait
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {done ? step.description : step.descriptionTodo}
                  </p>
                </div>

                {/* Chevron for steps 3 & 4 */}
                {isClickable && step.id !== "twitch" && (
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
              </div>

              {/* Inline CTA for step 1 */}
              {step.id === "twitch" && !done && (
                <div className="px-4 pb-4">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleStepClick(step)}
                  >
                    <Tv className="h-3.5 w-3.5" />
                    Connecter Twitch
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {allDone ? (
          <Button className="w-full sm:w-auto" onClick={handleComplete}>
            <Sparkles className="h-4 w-4" />
            Voir mon cockpit
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <>
            {nextActionable === "waiting" ? (
              scoreTimedOut ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    L'analyse prend plus longtemps que prévu.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Actualiser la page
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse en cours, laisse cette page ouverte…
                </div>
              )
            ) : nextActionable && nextActionable.id !== "twitch" ? (
              <Button className="w-full sm:w-auto" onClick={() => handleStepClick(nextActionable)}>
                {nextActionable.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
            <button
              onClick={handleComplete}
              className="text-xs text-muted-foreground/60 underline-offset-2 transition-colors hover:text-muted-foreground hover:underline"
            >
              Passer et accéder au cockpit
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingGuide;
