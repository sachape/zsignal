import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Clapperboard, Palette, Radio, Users } from "lucide-react";

// Task-oriented navigation cards for the dashboard.
// Replaces the old CreateNowBlock + DashboardQuickActions + NetworksTeaser,
// giving a single clear "what do you want to do?" surface.
const NAV = [
  { to: "/clips-reseaux", icon: Clapperboard, title: "Créer un clip", desc: "Un live → une vidéo 9:16 prête à poster", featured: true },
  { to: "/studio-visuel", icon: Palette, title: "Générer un visuel", desc: "Bannière, story, annonce de live", featured: false },
  { to: "/analyse", icon: Activity, title: "Mon StreamScore", desc: "Score, dimensions, reco prioritaire", featured: false },
  { to: "/live-setup", icon: Radio, title: "Préparer mon live", desc: "Titre, setup, planning", featured: false },
  { to: "/competitors", icon: Users, title: "Benchmark", desc: "Compare ta chaîne à ta catégorie", featured: false },
] as const;

const DashboardNavCards = () => (
  <section className="mb-6">
    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
      Que veux-tu faire ?
    </p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {NAV.map(({ to, icon: Icon, title, desc, featured }) => (
        <Link
          key={to}
          to={to}
          className={`group relative overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${
            featured
              ? "border-primary/40 bg-primary/[0.07] hover:border-primary/60 hover:bg-primary/[0.11]"
              : "border-white/[0.08] bg-card/60 hover:border-primary/30 hover:bg-card/80"
          }`}
        >
          {featured && (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-primary/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary">
              Recommandé
            </span>
          )}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <p className="mt-3 text-sm font-semibold leading-tight text-foreground">{title}</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{desc}</p>
          {!featured && (
            <ArrowUpRight className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/30 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          )}
        </Link>
      ))}
    </div>
  </section>
);

export default DashboardNavCards;
