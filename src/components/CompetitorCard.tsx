import { Users } from "lucide-react";

interface CompetitorCardProps {
  name: string;
  followers: string;
  similarity: number;
  locked?: boolean;
  reasons?: string[];
}

const CompetitorCard = ({ name, followers, similarity, locked, reasons }: CompetitorCardProps) => {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
        <Users className="h-5 w-5 text-accent" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{locked ? "••••••••" : name}</p>
        <p className="text-xs text-muted-foreground">{locked ? "•••" : followers} abonnés</p>
        {!locked && reasons && reasons.length > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground/70">{reasons.join(" · ")}</p>
        )}
      </div>
      <div className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        {locked ? "?" : `${similarity}%`} similaire
      </div>
    </div>
  );
};

export default CompetitorCard;
