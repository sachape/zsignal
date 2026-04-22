import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const LINKS = [
  {
    heading: "Produit",
    items: [
      { label: "Analyser ma chaîne", to: "/" },
      { label: "Fonctionnalités", to: "/#features" },
      { label: "Tarifs", to: "/#pricing" },
    ],
  },
  {
    heading: "Compte",
    items: [
      { label: "Se connecter", to: "/auth" },
      { label: "Créer un compte", to: "/auth" },
      { label: "Tableau de bord", to: "/dashboard" },
    ],
  },
  {
    heading: "Légal",
    items: [
      { label: "Conditions d'utilisation", to: "/terms" },
      { label: "Politique de confidentialité", to: "/privacy" },
    ],
  },
];

export default function FooterSection() {
  return (
    <footer className="border-t border-border/40 bg-card/30">
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        {/* Main grid */}
        <div className="grid gap-10 py-14 sm:grid-cols-[1.6fr_repeat(3,1fr)]">
          {/* Brand */}
          <div>
            <Link to="/" className="group inline-flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.45)] transition-shadow duration-300 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.65)]">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">StreamPulse</span>
            </Link>

            <p className="mt-4 max-w-[220px] text-sm leading-relaxed text-muted-foreground">
              Le copilote de croissance pour streamers Twitch sérieux.
            </p>

            <p className="mt-5 text-[11px] text-muted-foreground/60">
              Propulsé par l'API Twitch. Non affilié à Twitch Interactive, Inc.
            </p>
          </div>

          {/* Link columns */}
          {LINKS.map((col) => (
            <div key={col.heading}>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/30 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} StreamPulse. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground">
            Fait avec ♥ pour la communauté Twitch francophone
          </p>
        </div>
      </div>
    </footer>
  );
}
