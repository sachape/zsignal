import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

/**
 * Landing footer.
 *
 * Intentionally minimal while the product is pre-launch: we refuse to ship
 * decorative legal links that point nowhere, and we refuse to pad the
 * footer with single-item columns. What remains is real: brand, product
 * anchors that actually resolve, and the trust statement about read-only
 * access to the user's Twitch account.
 */

const NAV_LINKS = [
  { label: "Fonctionnalités", to: "/#features" },
  { label: "Comment ça marche", to: "/#how-it-works" },
  { label: "Tarifs", to: "/#pricing" },
  { label: "FAQ", to: "/#faq" },
];

const LandingFooter = () => (
  <footer className="relative border-t border-white/[0.06] bg-background py-10">
    <div className="container mx-auto max-w-6xl px-4 md:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Brand */}
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            Streamnco
          </span>
        </Link>

        {/* Inline nav */}
        <nav aria-label="Liens de bas de page">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-white/[0.06] pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
        <p>© 2026 Streamnco</p>
        <p className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          Lecture seule · aucune publication sur ta chaîne
        </p>
      </div>
    </div>
  </footer>
);

export default LandingFooter;
