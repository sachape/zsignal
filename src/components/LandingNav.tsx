import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const LandingNav = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">StreamPulse</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/connect-twitch"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Connecter Twitch
          </Link>
          <Link
            to="/connect-twitch"
            className="rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Commencer
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default LandingNav;
