import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface LockedOverlayProps {
  message?: string;
  cta?: string;
  to?: string;
}

const LockedOverlay = ({
  message = "Connecte-toi pour débloquer",
  cta = "Débloquer",
  to,
}: LockedOverlayProps) => {
  const { user } = useAuth();
  const destination =
    to || (user ? "/connect-twitch" : "/auth?redirect=/connect-twitch");

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/80 backdrop-blur-sm">
      <Lock className="h-4 w-4 text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <Button asChild size="sm">
        <Link to={destination}>{cta}</Link>
      </Button>
    </div>
  );
};

export default LockedOverlay;
