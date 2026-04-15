import type { LucideIcon } from "lucide-react";

interface RecommendationCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  locked?: boolean;
}

const RecommendationCard = ({ icon: Icon, title, description, locked }: RecommendationCardProps) => {
  return (
    <div className={`relative rounded-xl border border-border bg-card p-5 ${locked ? "opacity-60" : ""}`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {locked ? "Connecte Twitch pour débloquer cette recommandation" : description}
      </p>
    </div>
  );
};

export default RecommendationCard;
