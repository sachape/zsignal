import { Link } from "react-router-dom";
import { Zap, Twitter, Github } from "lucide-react";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", to: "/" },
      { label: "Tarifs", to: "/" },
      { label: "Aperçu", to: "/" },
      { label: "Connexion", to: "/auth" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Playbooks", to: "/playbooks" },
      { label: "Leaders", to: "/leaders" },
      { label: "FAQ", to: "/" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Confidentialité", to: "/" },
      { label: "Conditions", to: "/" },
      { label: "Mentions légales", to: "/" },
    ],
  },
];

const LandingFooter = () => (
  <footer className="relative border-t border-white/[0.06] bg-background py-14">
    <div className="container mx-auto max-w-6xl px-4 md:px-6">
      <div className="grid gap-10 md:grid-cols-12">
        {/* Brand */}
        <div className="md:col-span-5">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              StreamPulse
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Le copilote de croissance pour les streamers Twitch qui veulent
            progresser sérieusement.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <a
              href="#"
              aria-label="Twitter"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.06] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Twitter className="h-3.5 w-3.5" />
            </a>
            <a
              href="#"
              aria-label="GitHub"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.06] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Github className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-3 gap-6 md:col-span-7">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                {col.title}
              </h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
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
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-muted-foreground sm:flex-row">
        <p>© 2026 StreamPulse. Conçu pour les streamers qui veulent progresser.</p>
        <p className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          Tous les systèmes opérationnels
        </p>
      </div>
    </div>
  </footer>
);

export default LandingFooter;
