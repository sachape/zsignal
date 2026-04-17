import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TrustCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const TrustCard = ({ icon: Icon, title, description }: TrustCardProps) => {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success/10">
          <Icon className="h-4 w-4 text-success" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrustCard;
