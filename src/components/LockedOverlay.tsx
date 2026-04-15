import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
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

  // If user is authenticated, link to connect-twitch; otherwise to auth
  const destination = to || (user ? "/connect-twitch" : "/auth?redirect=/connect-twitch");

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
      <Lock className="mb-2 h-5 w-5 text-muted-foreground" />
      <p className="mb-3 text-sm font-medium text-muted-foreground">{message}</p>
      <Link
        to={destination}
        className="rounded-lg gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  );
};

export default LockedOverlay;
