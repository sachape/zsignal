import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clapperboard,
  Palette,
  ListChecks,
  Sparkles,
  Compass,
  TrendingUp,
  Radio,
  Type,
  CalendarDays,
  Smartphone,
  Subtitles,
  Wand2,
  Download,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import {
  GlassCard,
  MicroLabel,
  SectionHeading,
  SectionShell,
} from "@/components/landing/primitives";
import { usePageMeta } from "@/hooks/usePageMeta";

// ── Pillars overview ─────────────────────────────────────────────────────────
const PILLARS = [
  {
    id: "creer",
    icon: Sparkles,
    label: "Créer",
    desc: "Clips réseaux et visuels prêts à publier.",
  },
  {
    id: "organiser",
    icon: ListChecks,
    label: "Organiser",
    desc: "Retrouve et prépare tes contenus dans une file claire.",
  },
  {
    id: "analyser",
    icon: TrendingUp,
    label: "Analyser",
    desc: "Comprends pourquoi ta chaîne progresse ou stagne.",
  },
  {
    id: "live",
    icon: Radio,
    label: "Préparer son live",
    desc: "Meilleurs titres, planning et idées prêtes à utiliser.",
  },
];

// ── Small bullet ─────────────────────────────────────────────────────────────
const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2.5 text-sm text-foreground/85">
    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
      <Check className="h-2.5 w-2.5 text-primary" />
    </span>
    {children}
  </li>
);

const FeaturesPage = () => {
  usePageMeta({
    title: "Fonctionnalités — Streamnco",
    description:
      "Clips réseaux, Studio visuel, StreamScore, file de contenu et préparation de live. Tout ce qu'il te faut pour créer, organiser et améliorer le contenu autour de ton stream.",
    canonical: "https://streamnco.fr/features",
    robots: "index, follow",
  });

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <SectionShell className="pt-24 pb-8 sm:pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Fonctionnalités
          </span>
          <h1 className="font-display mt-5 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
            Crée, organise et améliore tout le contenu autour de ton stream.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-foreground/70 md:text-lg">
            Streamnco regroupe en un seul cockpit la création de clips et de visuels, l'organisation de ta file de contenu, l'analyse de ta progression et la préparation de tes lives.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Essayer gratuitement<ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">Voir les tarifs</Link>
            </Button>
          </div>
        </div>

        {/* Pillars summary */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-3 sm:grid-cols-2 md:mt-16 lg:grid-cols-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <a
                key={p.id}
                href={`#${p.id}`}
                className="group flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-card/40 p-4 backdrop-blur-xl transition-all hover:border-primary/30 hover:bg-card/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.label}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{p.desc}</p>
                </div>
              </a>
            );
          })}
        </div>
      </SectionShell>

      {/* ═══════════════════════════════════════════════════════════════
          1. CRÉER
          ═══════════════════════════════════════════════════════════════ */}
      <SectionShell id="creer">
        <SectionHeading
          badge="Créer"
          title="De ton live à ta publication, sans logiciel pro"
          subtitle="Génère des clips verticaux et des visuels prêts à publier — directement depuis Streamnco."
        />

        <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:mt-14 md:grid-cols-2">
          {/* Clips réseaux */}
          <GlassCard className="p-6 md:p-8" interactive>
            <div id="clips-reseaux" className="scroll-mt-24" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Clapperboard className="h-5 w-5 text-primary" />
              </div>
              <MicroLabel>Clips réseaux</MicroLabel>
            </div>
            <h3 className="font-display mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Vidéos verticales prêtes pour TikTok, Reels et Shorts
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Transforme un Clip Twitch, une VOD ou un upload en vidéo verticale prête à publier — facecam alignée sur le gameplay, sous-titres auto et téléchargement direct.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Bullet><span className="font-medium text-foreground">Format 9:16</span> optimisé mobile</Bullet>
              <Bullet><span className="font-medium text-foreground">Facecam + gameplay</span> alignés automatiquement</Bullet>
              <Bullet><span className="font-medium text-foreground">Sous-titres auto</span> avec plusieurs styles</Bullet>
              <Bullet><span className="font-medium text-foreground">Téléchargement direct</span> pour publier où tu veux</Bullet>
            </ul>
            <div className="mt-6">
              <Button asChild size="sm">
                <Link to="/clips-reseaux">
                  Créer un clip
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </GlassCard>

          {/* Studio visuel */}
          <GlassCard className="p-6 md:p-8" interactive>
            <div id="studio-visuel" className="scroll-mt-24" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <MicroLabel>Studio visuel</MicroLabel>
            </div>
            <h3 className="font-display mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Tes visuels Twitch et réseaux en quelques secondes
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              8 formats prêts à l'emploi, 3 variantes par génération, exportés aux bonnes dimensions. Crée une bannière, une story, un post ou une annonce de live sans toucher à un logiciel de design.
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-foreground/85">
              {["Bannière Twitch", "Story 9:16", "Post carré 1:1", "Annonce de live", "Cover YouTube", "Header X", "Schedule", "Offline screen"].map((f) => (
                <li key={f} className="flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3 text-primary/80" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button asChild size="sm">
                <Link to="/studio-visuel">
                  Générer un visuel
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </GlassCard>
        </div>
      </SectionShell>

      {/* ═══════════════════════════════════════════════════════════════
          2. ORGANISER
          ═══════════════════════════════════════════════════════════════ */}
      <SectionShell id="organiser">
        <SectionHeading
          badge="Organiser"
          title="Une file de contenu claire pour préparer tes publications"
          subtitle="Tes clips et visuels au même endroit — prêts à être téléchargés et publiés."
        />

        <div className="mx-auto mt-10 max-w-4xl">
          <GlassCard className="p-6 md:p-8" interactive>
            <div id="file-de-contenu" className="scroll-mt-24" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <ListChecks className="h-5 w-5 text-primary" />
              </div>
              <MicroLabel>File de contenu</MicroLabel>
            </div>
            <h3 className="font-display mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Retrouve tes clips et visuels dans une file claire
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Tous tes contenus générés sont rangés au même endroit avec leur statut (brouillon, prêt, publié). Tu prépares tes prochaines publications en quelques clics et tu télécharges ce dont tu as besoin.
            </p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              <Bullet>Contenus générés centralisés</Bullet>
              <Bullet>Brouillons et statuts visibles</Bullet>
              <Bullet>Préparation des publications</Bullet>
              <Bullet>Téléchargement et publication manuelle</Bullet>
            </ul>
            <p className="mt-5 text-xs text-muted-foreground/80">
              Publication automatique disponible sur YouTube. Instagram et TikTok en bêta selon les validations API des plateformes.
            </p>
            <div className="mt-6">
              <Button asChild size="sm" variant="outline">
                <Link to="/content-queue">
                  Voir la file de contenu
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </GlassCard>
        </div>
      </SectionShell>

      {/* ═══════════════════════════════════════════════════════════════
          3. ANALYSER
          ═══════════════════════════════════════════════════════════════ */}
      <SectionShell id="analyser">
        <SectionHeading
          badge="Analyser"
          title="Comprends pourquoi ta chaîne progresse ou stagne"
          subtitle="Un StreamScore clair, un benchmark utile, un historique qui parle."
        />

        <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:mt-14 md:grid-cols-2">
          {/* StreamScore */}
          <GlassCard className="p-6 md:p-8" interactive>
            <div id="streamscore" className="scroll-mt-24" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <MicroLabel>StreamScore</MicroLabel>
            </div>
            <h3 className="font-display mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Ton diagnostic complet, dimension par dimension
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Un score global, 6 dimensions analysées, des recommandations concrètes et un historique pour suivre tes progrès dans le temps.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Bullet>Score global et par dimension</Bullet>
              <Bullet>Recommandations priorisées</Bullet>
              <Bullet>Historique de progression</Bullet>
              <Bullet>Plan d'action hebdomadaire (Pro)</Bullet>
            </ul>
            <div className="mt-6">
              <Button asChild size="sm">
                <Link to="/streamscore">
                  Découvrir mon StreamScore
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </GlassCard>

          {/* Benchmark */}
          <GlassCard className="p-6 md:p-8" interactive>
            <div id="benchmark" className="scroll-mt-24" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Compass className="h-5 w-5 text-primary" />
              </div>
              <MicroLabel>Benchmark</MicroLabel>
            </div>
            <h3 className="font-display mt-4 text-2xl font-semibold tracking-tight text-foreground">
              Compare-toi à des streamers qui te ressemblent
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Identifie tes opportunités en te comparant à des chaînes proches en taille, en catégorie et en langue. Pas de fausse précision — uniquement des comparaisons utiles.
            </p>
            <ul className="mt-5 space-y-2.5">
              <Bullet>Concurrents directs filtrés</Bullet>
              <Bullet>Channels à rattraper</Bullet>
              <Bullet>Inspirations à plus grande échelle</Bullet>
              <Bullet>Score de pertinence par match</Bullet>
            </ul>
            <div className="mt-6">
              <Button asChild size="sm" variant="outline">
                <Link to="/competitors">
                  Voir le benchmark
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </GlassCard>
        </div>
      </SectionShell>

      {/* ═══════════════════════════════════════════════════════════════
          4. PRÉPARER SON LIVE
          ═══════════════════════════════════════════════════════════════ */}
      <SectionShell id="live">
        <SectionHeading
          badge="Préparer son live"
          title="Des lives mieux préparés, sans usine à gaz"
          subtitle="Titres, planning et idées prêtes à utiliser — pour streamer plus sereinement."
        />

        <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:mt-14 md:grid-cols-3">
          <GlassCard className="p-6" interactive>
            <div id="live-studio" className="scroll-mt-24" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Radio className="h-5 w-5 text-primary" />
              </div>
              <MicroLabel>Live Studio</MicroLabel>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Cockpit live</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Prépare et suis tes sessions live depuis un seul espace. Idéal pour rester concentré pendant le stream.
            </p>
          </GlassCard>

          <GlassCard className="p-6" interactive>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Type className="h-5 w-5 text-primary" />
              </div>
              <MicroLabel>Titres</MicroLabel>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Générateur de titres</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Récupère des idées de titres adaptés à ta catégorie pour mieux ressortir dans les vues populaires.
            </p>
          </GlassCard>

          <GlassCard className="p-6" interactive>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <MicroLabel>Planning</MicroLabel>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Planning de stream</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Organise tes créneaux pour gagner en régularité — un des leviers les plus rentables sur Twitch.
            </p>
          </GlassCard>
        </div>
      </SectionShell>

      {/* ── Quotas note ──────────────────────────────────────────────── */}
      <SectionShell className="pt-0">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.06] bg-card/40 p-6 text-center backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Quotas mensuels</p>
          <p className="mt-3 text-sm text-foreground/85">
            <span className="font-semibold text-foreground">Gratuit</span> : 5 visuels · 3 clips ·
            {" "}<span className="font-semibold text-foreground">Pro</span> : 100 visuels · 30 clips ·
            {" "}<span className="font-semibold text-foreground">Growth</span> : 300 visuels · 200 clips
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Les générations en échec ne sont pas comptées.
          </p>
          <div className="mt-5">
            <Button asChild size="sm" variant="outline">
              <Link to="/pricing">Voir les plans en détail</Link>
            </Button>
          </div>
        </div>
      </SectionShell>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <SectionShell>
        <div className="mx-auto max-w-3xl rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-card/30 p-8 text-center backdrop-blur-xl md:p-12">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Crée ton premier contenu avec Streamnco
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            Démarre gratuitement — pas de carte bancaire, pas de connexion Twitch obligatoire pour le diagnostic.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Essayer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">Voir les tarifs</Link>
            </Button>
          </div>
        </div>
      </SectionShell>

      <LandingFooter />
    </div>
  );
};

export default FeaturesPage;
