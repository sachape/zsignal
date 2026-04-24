import { Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";

interface LockedOverlayProps {
  message?: string;
  cta?: string;
  to?: string;
  /**
   * Custom unlock handler. When provided, it overrides the default
   * behaviour (which opens the generic auth modal). Used on flows that
   * must stay Twitch-first, like the free result page.
   */
  onUnlock?: () => void;
}

const LockedOverlay = ({
  message = "Connecte-toi pour débloquer",
  cta = "Débloquer",
  to,
  onUnlock,
}: LockedOverlayProps) => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  const handleClick = () => {
    if (onUnlock) {
      onUnlock();
      return;
    }
    if (to) {
      navigate(to);
      return;
    }
    if (user) {
      navigate("/connect-twitch");
    } else {
      openAuthModal({ redirectTo: "/connect-twitch" });
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/80 backdrop-blur-sm">
      <Lock className="h-4 w-4 text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {to ? (
        <Button asChild size="sm">
          <Link to={to}>{cta}</Link>
        </Button>
      ) : (
        <Button size="sm" onClick={handleClick}>
          {cta}
        </Button>
      )}
    </div>
  );
};

export default LockedOverlay;
