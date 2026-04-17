import { useState } from "react";
import { ThumbsUp, ThumbsDown, TrendingUp, Target, Star, EyeOff, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  saveFeedback,
  type FeedbackType,
} from "@/services/competitorFeedbackRepository";
import { useToast } from "@/hooks/use-toast";

interface Props {
  reportId: string;
  competitorKey: string;
}

const options: { type: FeedbackType; label: string; Icon: typeof ThumbsUp }[] = [
  { type: "relevant", label: "Pertinent", Icon: ThumbsUp },
  { type: "not_relevant", label: "Pas pertinent", Icon: ThumbsDown },
  { type: "too_big", label: "Trop gros", Icon: TrendingUp },
  { type: "wrong_niche", label: "Mauvaise niche", Icon: Target },
  { type: "good_example", label: "Bon exemple", Icon: Star },
  { type: "hidden", label: "Masquer", Icon: EyeOff },
];

const CompetitorFeedbackBar = ({ reportId, competitorKey }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState<FeedbackType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handle = async (type: FeedbackType) => {
    if (!user || submitting) return;
    setSubmitting(true);
    const { error } = await saveFeedback({
      userId: user.id,
      reportId,
      competitorKey,
      feedbackType: type,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer ton retour.", variant: "destructive" });
      return;
    }
    setSubmitted(type);
    toast({ title: "Merci !", description: "Ton retour a bien été pris en compte." });
  };

  if (submitted) {
    const opt = options.find((o) => o.type === submitted)!;
    return (
      <div className="mt-3 flex items-center gap-1.5 text-xs text-success">
        <Check className="h-3 w-3" />
        <span>Retour enregistré : {opt.label.toLowerCase()}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {options.map(({ type, label, Icon }) => (
        <button
          key={type}
          onClick={() => handle(type)}
          disabled={submitting}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background/50 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
          title={label}
        >
          <Icon className="h-2.5 w-2.5" />
          {label}
        </button>
      ))}
    </div>
  );
};

export default CompetitorFeedbackBar;
