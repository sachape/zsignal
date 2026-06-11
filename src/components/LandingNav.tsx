import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  Scissors,
  Palette,
  ListChecks,
  Gauge,
  BarChart3,
  Radio,
  Sparkles,
  Repeat,
  Image as ImageIcon,
  Trophy,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import logo from "@/assets/logo.svg";
import FounderBanner from "@/components/landing/FounderBanner";
import { cn } from "@/lib/utils";

type FeatureEntry = {
  label: string;
  description: string;
  href: string;
  icon: typeof Scissors;
};

const FEATURES: FeatureEntry[] = [
  {
    label: "Clips réseaux",
    description: "Transforme tes Clips Twitch et VOD en vidéos verticales prêtes à publier.",
    href: "/fonctionnalites#clips-reseaux",
    icon: Scissors,
  },
  {
    label: "Studio visuel",
    description: "Génère bannières, stories, posts et covers en quelques secondes.",
    href: "/fonctionnalites#studio-visuel",
    icon: Palette,
  },
  {
    label: "File de contenu",
    description: "Organise tes clips et visuels avant publication.",
    href: "/fonctionnalites#file-de-contenu",
    icon: ListChecks,
  },
  {
    label: "StreamScore",
    description: "Analyse ta chaîne et comprends quoi améliorer.",
    href: "/fonctionnalites#streamscore",
    icon: Gauge,
  },
  {
    label: "Benchmark",
    description: "Compare ta chaîne à d'autres streamers.",
    href: "/fonctionnalites#benchmark",
    icon: BarChart3,
  },
  {
    label: "Live Studio",
    description: "Prépare tes titres, ton planning et tes lives.",
    href: "/fonctionnalites#live-studio",
    icon: Radio,
  },
];

type SolutionEntry = {
  label: string;
  description: string;
  href: string;
  icon: typeof Sparkles;
};

const SOLUTIONS: SolutionEntry[] = [
  {
    label: "Streamer débutant",
    description: "Lancer une chaîne avec les bons réflexes dès le départ.",
    href: "/solutions#debutant",
    icon: Sparkles,
  },
  {
    label: "Streamer régulier",
    description: "Créer du contenu autour de chaque live, sans y passer la nuit.",
    href: "/solutions#regulier",
    icon: Repeat,
  },
  {
    label: "Recycler ses lives",
    description: "Tirer un maximum de clips et visuels de chaque session.",
    href: "/solutions#recycle",
    icon: Scissors,
  },
  {
    label: "Professionnaliser son image",
    description: "Identité visuelle cohérente sur Twitch et les réseaux.",
    href: "/solutions#image",
    icon: ImageIcon,
  },
  {
    label: "Progresser sérieusement",
    description: "Mesurer, benchmarker et améliorer mois après mois.",
    href: "/solutions#ambitieux",
    icon: Trophy,
  },
];

const FlatLinks = [
  { label: "Tarifs", href: "/pricing" },
  { label: "Articles", href: "/articles" },
  { label: "À propos", href: "/a-propos" },
] as const;

const MegaCard = ({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: typeof Sparkles;
  label: string;
  description: string;
}) => (
  <Link
    to={href}
    className="group flex items-start gap-3 rounded-xl border border-transparent p-3 transition-all hover:border-white/10 hover:bg-white/[0.03]"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/15">
      <Icon className="h-4 w-4" />
    </span>
    <span className="flex flex-col">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</span>
    </span>
  </Link>
);

const LandingNav = () => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogoClick = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
    setMobileOpen(false);
  };

  const ctaHref = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? "Tableau de bord" : "Essayer gratuitement";

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
          className="flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md"
          aria-label="Streamnco — Accueil"
        >
          <img src={logo} alt="Streamnco" className="h-6 w-auto" />
        </button>

        {/* Desktop nav */}
        <div className="hidden items-center md:flex">
          <NavigationMenu>
            <NavigationMenuList className="gap-0">
              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-9 bg-transparent px-3 text-sm font-medium text-muted-foreground hover:bg-white/[0.04] hover:text-foreground data-[state=open]:bg-white/[0.04] data-[state=open]:text-foreground">
                  Fonctionnalités
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[560px] p-3">
                    <div className="grid grid-cols-2 gap-1">
                      {FEATURES.map((f) => (
                        <MegaCard key={f.href} {...f} />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-border/40 px-3 pt-3">
                      <span className="text-xs text-muted-foreground">
                        Toutes les fonctionnalités
                      </span>
                      <Link
                        to="/fonctionnalites"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Voir la page
                        <ChevronDown className="h-3 w-3 -rotate-90" />
                      </Link>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="h-9 bg-transparent px-3 text-sm font-medium text-muted-foreground hover:bg-white/[0.04] hover:text-foreground data-[state=open]:bg-white/[0.04] data-[state=open]:text-foreground">
                  Solutions
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[480px] p-3">
                    <div className="grid grid-cols-1 gap-1">
                      {SOLUTIONS.map((s) => (
                        <MegaCard key={s.href} {...s} />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-border/40 px-3 pt-3">
                      <span className="text-xs text-muted-foreground">
                        Tous les cas d'usage
                      </span>
                      <Link
                        to="/solutions"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Voir la page
                        <ChevronDown className="h-3 w-3 -rotate-90" />
                      </Link>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {FlatLinks.map((link) => (
            <Link
              key={link.href}
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
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button size="sm" asChild>
              <Link to={ctaHref}>{ctaLabel}</Link>
            </Button>
          ) : (
            <>
              <button
                onClick={() => openAuthModal("login")}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Connexion
              </button>
              <Button size="sm" asChild className="shadow-[0_0_24px_hsl(var(--primary)/0.25)]">
                <Link to={ctaHref}>{ctaLabel}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-border/50 bg-background/95 px-4 pb-6 pt-3 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1">
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/30">
                Fonctionnalités
                <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-0.5 pl-2">
                {FEATURES.map((f) => (
                  <Link
                    key={f.href}
                    to={f.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  >
                    <f.icon className="h-4 w-4 text-primary" />
                    {f.label}
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/30">
                Solutions
                <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-0.5 pl-2">
                {SOLUTIONS.map((s) => (
                  <Link
                    key={s.href}
                    to={s.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  >
                    <s.icon className="h-4 w-4 text-primary" />
                    {s.label}
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {FlatLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/30 hover:text-foreground",
                  location.pathname === link.href ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    openAuthModal("login");
                    setMobileOpen(false);
                  }}
                >
                  Connexion
                </Button>
                <Button asChild className="w-full">
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Rocket className="mr-2 h-4 w-4" />
                    Essayer gratuitement
                  </Link>
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
