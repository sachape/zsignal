import { Link } from "react-router-dom";
import { Rocket, Clapperboard, Inbox, Network, RefreshCw, Sparkles } from "lucide-react";

const ACTIONS = [
  { to: "/live-setup", icon: Rocket, label: "Préparer un live", hint: "Setup en 60s" },
  { to: "/clips-reseaux", icon: Sparkles, label: "Créer un clip réseau", hint: "Depuis une VOD ou une vidéo" },
  { to: "/clips", icon: Clapperboard, label: "Générer un clip", hint: "Depuis un VOD" },
  { to: "/content-queue", icon: Inbox, label: "Contenus à publier", hint: "Queue YouTube" },
  { to: "/reseaux", icon: Network, label: "Connecter YouTube", hint: "OAuth en 1 clic" },
  { to: "/content-queue?refresh=1", icon: RefreshCw, label: "Rafraîchir analytics", hint: "Stats post-publi" },
];

const DashboardQuickActions = () => {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Actions rapides</h2>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          Cmd+K pour tout faire
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group flex flex-col gap-1.5 rounded-xl border border-border/50 bg-background/40 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
          >
            <action.icon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">{action.label}</span>
            <span className="text-[10px] text-muted-foreground/70">{action.hint}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DashboardQuickActions;
