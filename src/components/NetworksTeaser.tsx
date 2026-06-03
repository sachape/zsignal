import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NetworksTeaser() {
  return (
    <Card className="border-border/60 bg-gradient-to-r from-card to-muted/20">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug">
            Ton live ne doit pas mourir après Twitch.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            Connecte YouTube, TikTok et Instagram pour voir si tes lives se transforment vraiment en croissance multi-plateforme.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
          <Link to="/reseaux">
            Analyser mes réseaux
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
