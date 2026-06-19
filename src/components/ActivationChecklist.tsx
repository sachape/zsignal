import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, X, Tv, Sparkles, Clapperboard, Palette, ListChecks, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActivationChecklist } from "@/hooks/useActivationChecklist";

interface Props {
  userId: string;
  twitchConnected: boolean;
  hasReport: boolean;
}

interface Step {
  id: string;
  done: boolean;
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
  href: string;
  available: boolean; // prerequisites met
}

const dismissKey = (uid: string) => `streamnco:activation-dismissed:${uid}`;
const collapseKey = (uid: string) => `streamnco:activation-collapsed:${uid}`;

const ActivationChecklist = ({ userId, twitchConnected, hasReport }: Props) => {
  const state = useActivationChecklist({ userId, twitchConnected, hasReport });

  const [dismissed, setDismissed] = useState(false);
  // Collapsed by default: show only the header + progress + next-step CTA,
  // expand on demand. Keeps the dashboard light. User's explicit choice wins.
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey(userId)) === "1");
      setCollapsed(localStorage.getItem(collapseKey(userId)) !== "0");
    } catch { /* noop */ }
  }, [userId]);

  const steps: Step[] = useMemo(() => [
    {
      id: "twitch",
      done: state.twitchConnected,
      icon: Tv,
      title: "Connecte ta chaîne Twitch",
      description: "Streamnco analyse ta chaîne pour calculer ton StreamScore et personnaliser tes recommandations.",
      cta: "Connecter Twitch",
      href: "/connect-twitch",
      available: true,
    },
    {
      id: "score",
      done: state.hasReport,
      icon: Sparkles,
      title: "Découvre ton StreamScore",
      description: "Identifie tes forces, tes points faibles et les actions prioritaires pour progresser.",
      cta: "Voir mon analyse",
      href: "/analyse",
      available: state.twitchConnected,
    },
    {
      id: "clip",
      done: state.hasClip,
      icon: Clapperboard,
      title: "Crée ton premier clip",
      description: "Transforme un Clip Twitch, une VOD ou un upload en vidéo verticale prête à publier.",
      cta: "Créer un clip",
      href: "/clipping",
      available: state.twitchConnected,
    },
    {
      id: "visual",
      done: state.hasVisual,
      icon: Palette,
      title: "Génère ton premier visuel",
      description: "Crée une bannière, une story ou un post pour annoncer ton live ou ton contenu.",
      cta: "Générer un visuel",
      href: "/studio-visuel",
      available: true,
    },
  ], [state]);

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = doneCount === total;
  const nextStep = steps.find((s) => !s.done && s.available) ?? steps.find((s) => !s.done);

  const handleDismiss = () => {
    try { localStorage.setItem(dismissKey(userId), "1"); } catch { /* noop */ }
    setDismissed(true);
  };
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(collapseKey(userId), next ? "1" : "0"); } catch { /* noop */ }
  };

  if (state.loading) return null;
  if (dismissed) return null;
  // Auto-hide once fully activated (no need to keep showing a 5/5 banner forever).
  if (allDone) return null;

  return (
    <section
      aria-label="Activation Streamnco"
      className="mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Prends en main Streamnco</p>
          <p className="text-xs text-muted-foreground">
            {doneCount}/{total} étapes terminées · {allDone ? "tout est prêt" : `prochaine étape : ${nextStep?.title ?? ""}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Déplier" : "Réduire"}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Masquer"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(doneCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isNext = !step.done && step === nextStep;
            const clickable = !step.done && step.available;
            const content = (
              <div
                className={cn(
                  "flex h-full items-start gap-3 rounded-xl border p-3 transition-all",
                  step.done && "border-primary/20 bg-primary/[0.04]",
                  !step.done && isNext && "border-primary/40 bg-primary/[0.06] shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]",
                  !step.done && !isNext && "border-border/60 bg-card/40",
                  clickable && "hover:border-primary/30 hover:bg-card/60",
                  !clickable && !step.done && "opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    step.done
                      ? "border-primary/30 bg-primary/15 text-primary"
                      : "border-border/60 bg-muted/40 text-muted-foreground",
                  )}
                >
                  {step.done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-xs font-semibold leading-tight", step.done ? "text-foreground" : "text-foreground/90")}>
                      {step.title}
                    </p>
                    {step.done && (
                      <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                        Fait
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                    {step.description}
                  </p>
                  {!step.done && step.available && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                      {step.cta}
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  )}
                  {!step.done && !step.available && (
                    <p className="mt-2 text-[11px] text-muted-foreground/70">
                      Connecte Twitch d'abord
                    </p>
                  )}
                </div>
              </div>
            );

            return clickable ? (
              <Link key={step.id} to={step.href} className="block">
                {content}
              </Link>
            ) : (
              <div key={step.id}>{content}</div>
            );
          })}
        </div>
      )}

      {/* Next action footer (when collapsed) */}
      {collapsed && nextStep && nextStep.available && (
        <div className="px-4 pb-4">
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to={nextStep.href}>
              {nextStep.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
};

export default ActivationChecklist;
