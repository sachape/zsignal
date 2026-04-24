import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", to: "/#features" },
      { label: "Aperçu", to: "/#preview" },
      { label: "Tarifs", to: "/#pricing" },
    ],
  },
  {
    title: "Ressources",
    links: [{ label: "FAQ", to: "/#faq" }],
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
  <footer className="relative border-t border-white/[0.06] bg-background py-12">
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
            Le copilote de progression pour les streamers Twitch.
          </p>
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

      <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] pt-6 text-xs text-muted-foreground sm:flex-row">
        <p>© 2026 StreamPulse. Conçu pour les streamers qui veulent progresser.</p>
        <p className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          Lecture seule · aucune publication sur ta chaîne
        </p>
      </div>
    </div>
  </footer>
);

export default LandingFooter;
