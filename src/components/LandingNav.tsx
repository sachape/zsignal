import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Menu, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import logo from "@/assets/logo.svg";
import FounderBanner from "@/components/landing/FounderBanner";
import { cn } from "@/lib/utils";

const FEATURE_GROUPS = [
  {
    title: "Créer",
    href: "/fonctionnalites#creer",
    description: "Crée des clips et visuels prêts à publier.",
    links: [
      { label: "Clipping", href: "/fonctionnalites#clipping" },
      { label: "Studio visuel", href: "/fonctionnalites#studio-visuel" },
    ],
  },
  {
    title: "Organiser",
    href: "/fonctionnalites#organiser",
    description: "Centralise tes contenus avant publication.",
    links: [
      { label: "File de contenu", href: "/fonctionnalites#file-de-contenu" },
      { label: "Téléchargements", href: "/fonctionnalites#file-de-contenu" },
      { label: "Brouillons", href: "/fonctionnalites#file-de-contenu" },
      { label: "Réseaux connectés", href: "/fonctionnalites#reseaux-connectes", badge: "Bientôt" },
    ],
  },
  {
    title: "Analyser",
    href: "/fonctionnalites#analyser",
    description: "Comprends ce qui bloque ou accélère ta progression.",
    links: [
      { label: "StreamScore", href: "/fonctionnalites#streamscore" },
      { label: "Benchmark", href: "/fonctionnalites#benchmark" },
      { label: "Historique", href: "/fonctionnalites#streamscore" },
      { label: "Analyse Twitch", href: "/fonctionnalites#streamscore" },
    ],
  },
  {
    title: "Progresser",
    href: "/fonctionnalites#progresser",
    description: "Passe de l’analyse à l’action.",
    links: [
      { label: "Recommandations", href: "/fonctionnalites#progresser" },
      { label: "Plan d’action", href: "/fonctionnalites#progresser" },
      { label: "Live Studio", href: "/fonctionnalites#live-studio" },
      { label: "Titres", href: "/fonctionnalites#live-studio" },
      { label: "Planning", href: "/fonctionnalites#live-studio" },
    ],
  },
] as const;

const SOLUTION_LINKS = [
  {
    label: "Débutant",
    href: "/solutions#debutant",
    description: "Tu veux savoir quoi améliorer et créer tes premiers contenus propres.",
  },
  {
    label: "Intermédiaire",
    href: "/solutions#intermediaire",
    description: "Tu streams déjà et tu veux publier plus régulièrement.",
  },
  {
    label: "Confirmé",
    href: "/solutions#confirme",
    description: "Tu veux professionnaliser ton image, suivre tes performances et optimiser ta croissance.",
  },
] as const;

const STATIC_LINKS = [
  { label: "Tarifs", href: "/pricing" },
  { label: "Articles", href: "/articles" },
  { label: "À propos", href: "/a-propos" },
] as const;

type MegaMenu = "features" | "solutions" | null;

const normalizePath = (href: string) => href.split("#")[0];

const LandingNav = () => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MegaMenu>(null);
  const [scrolled, setScrolled] = useState(false);

  // Scroll-aware chrome: airy at the very top, condensed glass once scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogoClick = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
    setMobileOpen(false);
    setActiveMenu(null);
  };

  const activePath = (href: string) => location.pathname === normalizePath(href);

  const closeMenus = () => {
    setMobileOpen(false);
    setActiveMenu(null);
  };

  return (
    <nav
      className={cn(
        "fixed left-0 right-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "border-b border-white/[0.08] bg-background/[0.85] backdrop-blur-xl shadow-[0_8px_30px_-12px_hsl(var(--background))]"
          : "border-b border-white/[0.04] bg-background/[0.55] backdrop-blur-md",
      )}
      aria-label="Navigation principale"
    >
      <FounderBanner />
      <div
        className={cn(
          "container mx-auto flex max-w-6xl items-center justify-between px-4 transition-[height] duration-300 md:px-6",
          scrolled ? "h-14" : "h-16",
        )}
      >
        <button
          onClick={handleLogoClick}
          className="flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label="Streamnco - Accueil"
        >
          <img src={logo} alt="Streamnco" className="h-6 w-auto" />
        </button>

        <div className="relative hidden items-center gap-1 md:flex" onMouseLeave={() => setActiveMenu(null)}>
          <button
            onMouseEnter={() => setActiveMenu("features")}
            onFocus={() => setActiveMenu("features")}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activePath("/fonctionnalites") || activeMenu === "features"
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            Fonctionnalités
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          <button
            onMouseEnter={() => setActiveMenu("solutions")}
            onFocus={() => setActiveMenu("solutions")}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activePath("/solutions") || activeMenu === "solutions"
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            Solutions
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {STATIC_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onMouseEnter={() => setActiveMenu(null)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activePath(link.href)
                  ? "bg-white/[0.06] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}

          {activeMenu && (
            <div
              className="absolute left-1/2 top-full z-50 mt-4 w-[min(860px,calc(100vw-3rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#101318]/95 shadow-[0_28px_90px_-48px_rgba(170,255,80,0.45)] backdrop-blur-2xl"
              onMouseEnter={() => setActiveMenu(activeMenu)}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              {activeMenu === "features" ? (
                <div className="grid gap-px bg-white/[0.04] md:grid-cols-4">
                  {FEATURE_GROUPS.map((group) => (
                    <div key={group.title} className="bg-[#101318] p-5">
                      <Link
                        to={group.href}
                        onClick={closeMenus}
                        className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground"
                      >
                        {group.title}
                        <ArrowRight className="h-3.5 w-3.5 text-primary-strong opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                      <p className="mt-2 min-h-[48px] text-xs leading-relaxed text-muted-foreground">
                        {group.description}
                      </p>
                      <div className="mt-4 space-y-2">
                        {group.links.map((item) => (
                          <Link
                            key={`${group.title}-${item.label}`}
                            to={item.href}
                            onClick={closeMenus}
                            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                          >
                            <span>{item.label}</span>
                            {"badge" in item && item.badge ? (
                              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
                                {item.badge}
                              </span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-px bg-white/[0.04] md:grid-cols-3">
                  {SOLUTION_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={closeMenus}
                      className="group bg-[#101318] p-5 transition-colors hover:bg-[#141922]"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <ArrowRight className="h-4 w-4 text-primary-strong opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button size="sm" asChild>
              <Link to="/dashboard">Tableau de bord</Link>
            </Button>
          ) : (
            <>
              <button
                onClick={() => openAuthModal("login")}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                Connexion
              </button>
              <Button size="sm" className="gap-1.5" onClick={() => openAuthModal("signup")}>
                <Sparkles className="h-3.5 w-3.5" />
                Essayer gratuitement
              </Button>
            </>
          )}
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.04] hover:text-foreground md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-white/[0.06] bg-background/[0.98] px-4 pb-6 pt-4 backdrop-blur-xl md:hidden">
          <div className="space-y-5">
            <div>
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                Fonctionnalités
              </p>
              <div className="mt-2 space-y-2">
                {FEATURE_GROUPS.map((group) => (
                  <div key={group.title} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <Link to={group.href} onClick={closeMenus} className="text-sm font-semibold text-foreground">
                      {group.title}
                    </Link>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{group.description}</p>
                    <div className="mt-3 grid grid-cols-2 gap-1">
                      {group.links.map((item) => (
                        <Link
                          key={`${group.title}-${item.label}`}
                          to={item.href}
                          onClick={closeMenus}
                          className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                        >
                          {item.label}
                          {"badge" in item && item.badge ? (
                            <span className="ml-1 text-[9px] font-semibold uppercase text-amber-200">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                Solutions
              </p>
              <div className="mt-2 space-y-2">
                {SOLUTION_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={closeMenus}
                    className="block rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"
                  >
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.description}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-1">
              {STATIC_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={closeMenus}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.05] hover:text-foreground",
                    activePath(link.href) ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {user ? (
              <Button asChild className="w-full">
                <Link to="/dashboard" onClick={closeMenus}>
                  Tableau de bord
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    openAuthModal("login");
                    closeMenus();
                  }}
                >
                  Connexion
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    openAuthModal("signup");
                    closeMenus();
                  }}
                >
                  Essayer gratuitement
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
