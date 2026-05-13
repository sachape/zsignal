import { Link, useNavigate, useLocation } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { ARTICLES } from "@/data/articles";

const PRODUCT_LINKS = [
  { label: "Aperçu", anchor: "preview" },
  { label: "Comment ça marche", anchor: "how-it-works" },
  { label: "Fonctionnalités", anchor: "features" },
  { label: "Tarifs", anchor: "pricing" },
  { label: "FAQ", anchor: "faq" },
];

const LEGAL_LINKS = [
  { label: "Conditions générales", href: "/legal/terms" },
  { label: "Confidentialité", href: "/legal/privacy" },
  { label: "Mentions légales", href: "/legal/mentions" },
  { label: "Cookies", href: "/legal/cookies" },
];

const colTitleCls =
  "mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-foreground/40";
const linkCls =
  "text-sm text-muted-foreground transition-colors hover:text-foreground";
const btnCls =
  "block w-full text-left text-sm text-muted-foreground transition-colors hover:text-foreground";

const LandingFooter = () => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToHero = () => {
    if (location.pathname === "/") {
      document
        .querySelector<HTMLElement>("section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        document
          .querySelector<HTMLInputElement>('input[type="text"], input[type="search"]')
          ?.focus();
      }, 600);
    } else {
      navigate("/");
    }
  };

  const handleAnchorClick =
    (anchor: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (location.pathname === "/") {
        e.preventDefault();
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
      }
    };


  return (
    <footer className="relative border-t border-white/[0.06] bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-14">

        {/* 5-column grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr]">

          {/* Marque */}
          <div>
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">Streamnco</span>
            </Link>
            <p className="mt-4 text-sm font-medium text-foreground/70">
              Le copilote de progression pour streamers Twitch.
            </p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Analyse ta chaîne, comprends tes blocages et transforme tes lives en
              plan d'action clair.
            </p>
            <a
              href="#"
              aria-label="Instagram"
              className="mt-5 inline-flex text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>

          {/* Produit */}
          <div>
            <p className={colTitleCls}>Produit</p>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map(({ label, anchor }) => (
                <li key={anchor}>
                  <a
                    href={`/#${anchor}`}
                    onClick={handleAnchorClick(anchor)}
                    className={linkCls}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Accès */}
          <div>
            <p className={colTitleCls}>Accès</p>
            <ul className="space-y-2.5">
              <li>
                <button onClick={scrollToHero} className={btnCls}>
                  Analyser ma chaîne
                </button>
              </li>
              <li>
                {user ? (
                  <Link to="/dashboard" className={linkCls}>
                    Tableau de bord
                  </Link>
                ) : (
                  <button
                    onClick={() => openAuthModal({ redirectTo: "/dashboard" })}
                    className={btnCls}
                  >
                    Se connecter
                  </button>
                )}
              </li>
            </ul>
          </div>

          {/* Blog */}
          <div>
            <p className={colTitleCls}>Blog</p>
            <ul className="space-y-2.5">
              <li>
                <Link to="/blog" className={linkCls}>
                  Tous les articles
                </Link>
              </li>
              {ARTICLES.slice(0, 4).map((a) => (
                <li key={a.slug}>
                  <Link to={`/blog/${a.slug}`} className={linkCls + " line-clamp-1"}>
                    {a.title.split(":")[0].split("—")[0].trim()}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className={colTitleCls}>Contact</p>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="mailto:contact@streamnco.com"
                  className={linkCls}
                >
                  contact@streamnco.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-white/[0.06] pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              © 2026 Streamnco. Tous droits réservés.
            </p>
            <nav aria-label="Liens légaux" className="flex flex-wrap gap-x-4 gap-y-1">
              {LEGAL_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  to={href}
                  className="text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
