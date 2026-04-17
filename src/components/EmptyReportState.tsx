import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

const EmptyReportState = ({
  title = "Aucune analyse pour le moment",
  description = "Lance ta première analyse pour découvrir ton StreamScore, tes concurrents et tes priorités.",
  ctaLabel = "Lancer une analyse",
  ctaHref = "/analyze",
}: Props) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild className="mt-2">
          <Link to={ctaHref}>{ctaLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmptyReportState;
