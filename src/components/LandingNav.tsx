import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import logo from "@/assets/logo.svg";
import FounderBanner from "@/components/landing/FounderBanner";


const NAV_LINKS = [
  { label: "Aperçu", anchor: "preview" },
  { label: "Comment ça marche", anchor: "how-it-works" },
  { label: "Fonctionnalités", anchor: "features" },
  { label: "Tarifs", anchor: "pricing" },
  { label: "FAQ", anchor: "faq" },
] as const;

const LandingNav = () => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollToHero = () => {
    if (location.pathname === "/") {
      const section = document.querySelector<HTMLElement>("section");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(
          'input[type="text"], input[type="search"]',
        );
        input?.focus();
      }, 600);
    } else {
      navigate("/");
    }
    setMobileOpen(false);
  };

  const handleAnchorClick =
    (anchor: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      setMobileOpen(false);
      if (location.pathname === "/") {
        e.preventDefault();
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
      }
    };

  return (
    <nav
      className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
      aria-label="Navigation principale"
    >
      <FounderBanner />
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center" aria-label="Streamnco">
          <img src={logo} alt="Streamnco" className="h-6 w-auto" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-0.5 md:flex" role="list">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={`/#${link.anchor}`}
              onClick={handleAnchorClick(link.anchor)}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Tableau de bord</Link>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAuthModal({ redirectTo: "/dashboard" })}
                className="text-muted-foreground hover:text-foreground"
              >
                Se connecter
              </Button>
              <Button size="sm" onClick={scrollToHero}>
                Analyser ma chaîne
              </Button>
            </>
          )}
        </div>

        {/* Mobile: primary CTA + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {user ? (
            <Button asChild size="sm" className="h-8 px-3 text-xs">
              <Link to="/dashboard">Tableau de bord</Link>
            </Button>
          ) : (
            <Button size="sm" onClick={scrollToHero} className="h-8 px-3 text-xs">
              Analyser ma chaîne
            </Button>
          )}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="border-t border-border bg-background/95 backdrop-blur-md md:hidden"
        >
          <div className="container mx-auto max-w-6xl px-4 py-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={`/#${link.anchor}`}
                onClick={handleAnchorClick(link.anchor)}
                className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 border-t border-border pt-3">
              {!user && (
                <button
                  onClick={() => {
                    openAuthModal({ redirectTo: "/dashboard" });
                    setMobileOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  Se connecter
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNav;
