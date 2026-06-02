import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { ARTICLES } from "@/data/articles";
import logo from "@/assets/logo.svg";

const PRODUCT_LINKS = [
  { label: "Fonctionnalités", href: "/features" },
  { label: "Solutions", href: "/solutions" },
  { label: "Tarifs", href: "/pricing" },
  { label: "Articles", href: "/blog" },
];

const LEGAL_LINKS = [
  { label: "Conditions générales", href: "/legal/terms" },
  { label: "Confidentialité", href: "/legal/privacy" },
  { label: "Mentions légales", href: "/legal/mentions" },
  { label: "Cookies", href: "/legal/cookies" },
];

const colTitle = "mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35";
const linkCls  = "text-sm text-muted-foreground/70 transition-colors hover:text-foreground";

const LandingFooter = () => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  return (
    <footer className="relative mt-auto border-t border-white/[0.05]">
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.4fr]">

          {/* ── Brand ── */}
          <div>
            <Link to="/" className="inline-block" aria-label="Streamnco">
              <img src={logo} alt="Streamnco" className="h-6 w-auto" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground/70">
              Le copilote de progression pour streamers Twitch. Score, blocages, plan d'action — en moins d'une minute.
            </p>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/streamnco.fr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Streamnco"
              className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground/50 transition-colors hover:text-foreground"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @streamnco.fr
            </a>
          </div>

          {/* ── Produit ── */}
          <div>
            <p className={colTitle}>Produit</p>
            <ul className="space-y-3">
              {PRODUCT_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link to={href} className={linkCls}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Accès ── */}
          <div>
            <p className={colTitle}>Accès</p>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => navigate("/")}
                  className="text-sm text-muted-foreground/70 transition-colors hover:text-foreground text-left"
                >
                  Analyser ma chaîne
                </button>
              </li>
              {user ? (
                <li>
                  <Link to="/dashboard" className={linkCls}>Tableau de bord</Link>
                </li>
              ) : (
                <>
                  <li>
                    <button
                      onClick={() => openAuthModal("login")}
                      className="text-sm text-muted-foreground/70 transition-colors hover:text-foreground text-left"
                    >
                      Se connecter
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => openAuthModal("signup")}
                      className="text-sm text-muted-foreground/70 transition-colors hover:text-foreground text-left"
                    >
                      Créer un compte
                    </button>
                  </li>
                </>
              )}
              <li>
                <Link to="/pricing" className={linkCls}>Voir les tarifs</Link>
              </li>
            </ul>
          </div>

          {/* ── Articles ── */}
          <div>
            <p className={colTitle}>Articles</p>
            <ul className="space-y-3">
              <li>
                <Link to="/blog" className={linkCls}>Tous les articles</Link>
              </li>
              {ARTICLES.slice(0, 3).map((a) => (
                <li key={a.slug}>
                  <Link
                    to={`/blog/${a.slug}`}
                    className={linkCls + " line-clamp-1 block"}
                  >
                    {a.title.split(":")[0].split("—")[0].trim()}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.05] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground/40">
            © 2026 Streamnco. Tous droits réservés.
          </p>
          <nav aria-label="Liens légaux" className="flex flex-wrap gap-x-5 gap-y-1">
            {LEGAL_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                to={href}
                className="text-xs text-muted-foreground/35 transition-colors hover:text-muted-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
