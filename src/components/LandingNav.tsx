import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import logo from "@/assets/logo.svg";
import FounderBanner from "@/components/landing/FounderBanner";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "/fonctionnalites" },
  { label: "Solutions", href: "/solutions" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Articles", href: "/articles" },
  { label: "À propos", href: "/a-propos" },
] as const;

const LandingNav = () => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogoClick = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(
          'input[type="text"], input[type="search"]',
        );
        input?.focus();
      }, 400);
    } else {
      navigate("/");
    }
    setMobileOpen(false);
  };

  const handleAnchorNav = (anchor: string) => {
    setMobileOpen(false);
    if (location.pathname === "/") {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
      }, 350);
    }
  };

  return (
    <nav
      className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md"
      aria-label="Navigation principale"
    >
      <FounderBanner />
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <button
          onClick={handleLogoClick}
          className="flex shrink-0 items-center focus-visible:outline-none"
          aria-label="Streamnco — Accueil"
        >
          <img src={logo} alt="Streamnco" className="h-6 w-auto" />
        </button>

        {/* Desktop nav */}
        <div className="hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map((link) =>
            "anchor" in link && link.anchor ? (
              <button
                key={link.label}
                onClick={() => handleAnchorNav("pricing")}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors hover:text-foreground",
                  location.pathname === link.href
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            ),
          )}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button size="sm" asChild>
              <Link to="/dashboard">Tableau de bord</Link>
            </Button>
          ) : (
            <>
              <button
                onClick={() => openAuthModal("login")}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Connexion
              </button>
              <Button size="sm" asChild>
                <Link to="/">Analyser ma chaîne</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 px-4 pb-6 pt-4 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) =>
              "anchor" in link && link.anchor ? (
                <button
                  key={link.label}
                  onClick={() => handleAnchorNav("pricing")}
                  className="rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/30 hover:text-foreground",
                    location.pathname === link.href ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {user ? (
              <Button asChild className="w-full">
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                  Tableau de bord
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" className="w-full" onClick={() => { openAuthModal("login"); setMobileOpen(false); }}>
                  Connexion
                </Button>
                <Button asChild className="w-full">
                  <Link to="/" onClick={() => setMobileOpen(false)}>Analyser ma chaîne</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNav;
