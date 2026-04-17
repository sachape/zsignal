import { Link, useLocation, useNavigate } from "react-router-dom";
import { Zap, LogOut, LayoutDashboard, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = user
    ? [
        { path: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
        { path: "/connect-twitch", label: "Twitch", icon: Link2 },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link
              to={user ? "/dashboard" : "/"}
              className="flex items-center gap-2"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                StreamPulse
              </span>
            </Link>
            {navItems.length > 0 && (
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

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
                  <LogOut className="h-3.5 w-3.5" />
                  Déconnexion
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Se connecter</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};

export default AppShell;
