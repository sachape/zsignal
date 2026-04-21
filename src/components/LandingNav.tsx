import { Link, useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";

const LandingNav = () => {
  const { user, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            StreamPulse
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
              >
                Déconnexion
              </Button>
              <Button asChild size="sm">
                <Link to="/dashboard">Tableau de bord</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAuthModal({ redirectTo: "/dashboard" })}
              >
                Se connecter
              </Button>
              <Button
                size="sm"
                onClick={() => openAuthModal({ redirectTo: "/dashboard" })}
              >
                Commencer
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default LandingNav;
