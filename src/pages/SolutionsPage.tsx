import { Link } from "react-router-dom";
import {
  ArrowRight,
  Rocket,
  Repeat,
  Recycle,
  Palette,
  TrendingUp,
  Check,
  Clapperboard,
  Sparkles,
  ListChecks,
  CalendarDays,
  Compass,
  Image as ImageIcon,
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

interface Persona {
  id: string;
  icon: React.ElementType;
  tag: string;
  headline: string;
  promise: string;
  bullets: { icon: React.ElementType; label: string; sub: string }[];
  cta: { label: string; href: string };
  highlighted?: boolean;
}

const PERSONAS: Persona[] = [
  {
    id: "debutant",
    icon: Rocket,
    tag: "Streamer débutant",
    headline: "Comprends quoi améliorer et crée tes premiers contenus sans te perdre.",
    promise: "Pose tout de suite de bonnes bases avec un diagnostic clair et de quoi créer du contenu autour de tes premiers lives.",
    bullets: [
      { icon: Sparkles, label: "StreamScore", sub: "Identifie ce qui freine ta progression dès le départ" },
      { icon: Palette, label: "Studio visuel", sub: "Crée une bannière et un visuel d'annonce propres" },
      { icon: Clapperboard, label: "Clips réseaux", sub: "Publie un premier clip pour tester les formats courts" },
      { icon: ListChecks, label: "Checklist d'activation", sub: "Avance étape par étape sans te disperser" },
    ],
    cta: { label: "Essayer gratuitement", href: "/auth" },
  },
  {
    id: "regulier",
    icon: Repeat,
    tag: "Streamer régulier",
    headline: "Recycle tes lives en contenus courts et garde une présence régulière sur les réseaux.",
    promise: "Tu streames déjà régulièrement — Streamnco transforme cette régularité en contenu qui continue de bosser pour toi entre deux lives.",
    bullets: [
      { icon: Clapperboard, label: "Clips réseaux", sub: "Génère un clip vertical après chaque live" },
      { icon: ListChecks, label: "File de contenu", sub: "Centralise clips et visuels prêts à publier" },
      { icon: Palette, label: "Studio visuel", sub: "Annonce ton planning, tes events, tes prochains lives" },
      { icon: CalendarDays, label: "Planning", sub: "Garde des créneaux clairs et lisibles" },
    ],
    cta: { label: "Créer un clip", href: "/clips-reseaux" },
    highlighted: true,
  },
  {
    id: "recycle",
    icon: Recycle,
    tag: "Créateur qui veut recycler ses lives",
    headline: "Transforme tes VOD et Clips Twitch en contenus prêts à publier.",
    promise: "Tes lives ne s'arrêtent plus à la fin du stream. Récupère les meilleurs moments et publie-les là où ton audience consomme déjà du contenu court.",
    bullets: [
      { icon: Clapperboard, label: "VOD & Clips Twitch", sub: "Colle un lien, importe une VOD, ou upload un fichier" },
      { icon: Sparkles, label: "Format vertical 9:16", sub: "Facecam et gameplay alignés automatiquement" },
      { icon: Sparkles, label: "Sous-titres auto", sub: "Plusieurs styles pour matcher ton identité" },
      { icon: ListChecks, label: "Téléchargement direct", sub: "Publie manuellement sur TikTok, Reels, Shorts" },
    ],
    cta: { label: "Importer une VOD", href: "/clips-reseaux" },
  },
  {
    id: "image",
    icon: Palette,
    tag: "Streamer qui veut professionnaliser son image",
    headline: "Crée des visuels plus propres pour ton stream, tes réseaux et tes annonces.",
    promise: "Une identité visuelle cohérente sans freelance ni Photoshop — pour tes bannières, stories, posts et covers.",
    bullets: [
      { icon: ImageIcon, label: "8 formats prêts", sub: "Bannière Twitch, story, post, cover, annonce live…" },
      { icon: Palette, label: "3 variantes par génération", sub: "Choisis celle qui colle à ton univers" },
      { icon: Sparkles, label: "Export aux bonnes dimensions", sub: "Plus de visuels recadrés ou flous" },
      { icon: ListChecks, label: "File de contenu", sub: "Retrouve tous tes visuels en un endroit" },
    ],
    cta: { label: "Générer un visuel", href: "/studio-visuel" },
  },
  {
    id: "ambitieux",
    icon: TrendingUp,
    tag: "Streamer qui veut progresser sérieusement",
    headline: "Analyse ta progression, compare-toi et suis un plan d'action.",
    promise: "Arrête de naviguer à vue. Streamnco te donne un score, un historique, des concurrents pertinents et un plan d'action priorisé.",
    bullets: [
      { icon: Sparkles, label: "StreamScore", sub: "Score global et 6 dimensions analysées" },
      { icon: Compass, label: "Benchmark", sub: "Comparaison avec des chaînes vraiment proches" },
      { icon: TrendingUp, label: "Historique", sub: "Suis tes progrès sur 30, 60, 90 jours" },
      { icon: ListChecks, label: "Recommandations", sub: "Plan d'action hebdomadaire priorisé (Pro)" },
    ],
    cta: { label: "Découvrir mon StreamScore", href: "/streamscore" },
  },
];

const SolutionsPage = () => {
  usePageMeta({
    title: "Solutions — Streamnco pour ton profil de streamer",
    description:
      "Que tu débutes, que tu streames régulièrement ou que tu vises la progression sérieuse, Streamnco s'adapte à ton profil pour créer, organiser et améliorer ton contenu.",
    canonical: "https://streamnco.fr/solutions",
    robots: "index, follow",
  });

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <SectionShell className="pt-24 pb-8 sm:pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Solutions
          </span>
          <h1 className="font-display mt-5 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
            Streamnco s'adapte à ton profil de streamer.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-foreground/70 md:text-lg">
            Que tu débutes ou que tu vises la progression sérieuse, voici comment créer, organiser et améliorer le contenu autour de ton stream — selon où tu en es.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Essayer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/fonctionnalites">Voir les fonctionnalités</Link>
            </Button>
          </div>
        </div>

        {/* Quick nav */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            return (
              <a
                key={p.id}
                href={`#${p.id}`}
                className="group flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-card/40 px-3 py-2.5 backdrop-blur-xl transition-all hover:border-primary/30 hover:bg-card/60"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground/85 leading-tight">{p.tag}</span>
              </a>
            );
          })}
        </div>
      </SectionShell>

      {/* ── Personas ─────────────────────────────────────────────────── */}
      {PERSONAS.map((p, idx) => {
        const Icon = p.icon;
        return (
          <SectionShell key={p.id} id={p.id} className={idx % 2 === 1 ? "" : ""}>
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:items-center">
              {/* Left: pitch */}
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <MicroLabel>{p.tag}</MicroLabel>
                  {p.highlighted && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Le plus courant
                    </span>
                  )}
                </div>
                <h2 className="font-display mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                  {p.headline}
                </h2>
                <p className="mt-4 text-sm text-muted-foreground md:text-base">
                  {p.promise}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to={p.cta.href}>
                      {p.cta.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/pricing">Voir les tarifs</Link>
                  </Button>
                </div>
              </div>

              {/* Right: bullets */}
              <GlassCard className="p-6 md:p-8" interactive>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                  Ce que Streamnco fait pour toi
                </p>
                <ul className="mt-5 space-y-4">
                  {p.bullets.map((b) => {
                    const BIcon = b.icon;
                    return (
                      <li key={b.label} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                          <BIcon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{b.label}</p>
                          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{b.sub}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </GlassCard>
            </div>
          </SectionShell>
        );
      })}

      {/* ── Quotas reminder ─────────────────────────────────────────── */}
      <SectionShell className="pt-0">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.06] bg-card/40 p-6 text-center backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Quotas mensuels</p>
          <p className="mt-3 text-sm text-foreground/85">
            <span className="font-semibold text-foreground">Gratuit</span> : 5 visuels · 3 clips ·
            {" "}<span className="font-semibold text-foreground">Pro</span> : 100 visuels · 30 clips ·
            {" "}<span className="font-semibold text-foreground">Growth</span> : 300 visuels · 200 clips
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Les générations en échec ne sont pas comptées. Publication automatique disponible sur YouTube ; Instagram et TikTok en bêta selon les validations API.
          </p>
        </div>
      </SectionShell>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <SectionShell>
        <div className="mx-auto max-w-3xl rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-card/30 p-8 text-center backdrop-blur-xl md:p-12">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Choisis ton point de départ
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            Démarre gratuitement et avance à ton rythme. Pas de carte bancaire pour commencer.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Essayer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/fonctionnalites">Voir les fonctionnalités</Link>
            </Button>
          </div>
        </div>
      </SectionShell>

      <LandingFooter />
    </div>
  );
};

export default SolutionsPage;
