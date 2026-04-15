import { Users } from "lucide-react";

interface CompetitorCardProps {
  name: string;
  followers: string;
  similarity: number;
  locked?: boolean;
}

const CompetitorCard = ({ name, followers, similarity, locked }: CompetitorCardProps) => {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
        <Users className="h-5 w-5 text-accent" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{locked ? "••••••••" : name}</p>
        <p className="text-xs text-muted-foreground">{locked ? "•••" : followers} followers</p>
      </div>
      <div className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        {locked ? "?" : `${similarity}%`} match
      </div>
    </div>
  );
};

export default CompetitorCard;
