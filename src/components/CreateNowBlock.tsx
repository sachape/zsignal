import { Link } from "react-router-dom";
import { ArrowRight, Clapperboard, Palette } from "lucide-react";

/**
 * "Créer maintenant" — premium dashboard block highlighting the two
 * creation features (Clipping + Studio visuel). Sits above the
 * legacy quick actions row.
 */
const CreateNowBlock = () => {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.10),transparent_55%)] bg-card/50 p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
            Créer maintenant
          </p>
          <h2 className="mt-1 text-base font-semibold text-foreground">
            Transforme ton stream en contenus prêts à publier.
          </h2>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CreateCard
          to="/clipping"
          icon={Clapperboard}
          title="Créer un clip"
          description="Transforme un Clip Twitch ou une VOD en vidéo verticale avec facecam, gameplay et sous-titres."
          cta="Lancer la création"
        />
        <CreateCard
          to="/studio-visuel"
          icon={Palette}
          title="Générer un visuel"
          description="Crée une bannière Twitch, une story ou un post réseau en quelques secondes."
          cta="Ouvrir le studio"
        />
      </div>
    </section>
  );
};

interface CreateCardProps {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
}

const CreateCard = ({ to, icon: Icon, title, description, cta }: CreateCardProps) => (
  <Link
    to={to}
    className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-background/40 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.04]"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary-strong ring-1 ring-primary/20 transition-transform group-hover:scale-105">
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
    <div className="flex items-center gap-1.5 text-xs font-medium text-primary-strong">
      {cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </div>
  </Link>
);

export default CreateNowBlock;
