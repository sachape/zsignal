import { Link, useLocation } from "react-router-dom";
import { Zap, BarChart3, Search, Link2 } from "lucide-react";

const navItems = [
  { path: "/", label: "Accueil", icon: Search },
  { path: "/analyze", label: "Analyse", icon: BarChart3 },
  { path: "/result", label: "Résultats", icon: BarChart3 },
  { path: "/connect-twitch", label: "Connexion", icon: Link2 },
];

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center gap-6 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">StreamPulse</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};

export default AppShell;
