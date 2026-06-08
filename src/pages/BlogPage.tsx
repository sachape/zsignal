import { Link } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import LandingNav from "@/components/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { SectionShell, SectionBadge } from "@/components/landing/primitives";
import { ARTICLES } from "@/data/articles";
import { usePageMeta } from "@/hooks/usePageMeta";

const CATEGORY_COLORS: Record<string, string> = {
  Croissance: "border-primary/30 bg-primary/10 text-primary",
  Affiliation: "border-accent/30 bg-accent/10 text-accent",
  Stratégie: "border-primary/30 bg-primary/10 text-primary",
  Outils: "border-info/30 bg-info/10 text-info",
  Analytics: "border-info/30 bg-info/10 text-info",
};

const ArticleCard = ({ article, featured = false }: { article: typeof ARTICLES[number]; featured?: boolean }) => (
  <Link
    to={`/articles/${article.slug}`}
    className={`group flex flex-col overflow-hidden rounded-2xl border-2 border-foreground/70 bg-card transition-all duration-150 hover:-translate-x-px hover:-translate-y-px ${featured ? "md:col-span-2" : ""}`}
    style={{ boxShadow: "4px 4px 0 0 rgba(23,29,46,0.72)" }}
  >
    {/* Illustration zone — fond sombre pour que les SVG ressortent */}
    <div className={`relative overflow-hidden bg-black border-b-2 border-foreground/70 ${featured ? "h-52 md:h-64" : "h-40"}`}>
      <div className="absolute inset-0 flex items-center justify-center p-6 opacity-90">
        {article.illustration}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
    </div>

    {/* Content */}
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full border-2 border-foreground/20 bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/60">
          {article.category}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {article.readingTime} min
        </span>
      </div>

      <h2 className={`mt-3 font-display font-bold leading-snug text-foreground transition-colors group-hover:text-primary ${featured ? "text-xl" : "text-base"}`}>
        {article.title}
      </h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {article.excerpt}
      </p>

      <div className="mt-4 flex items-center gap-1 text-xs font-bold text-foreground/50 transition-colors group-hover:text-primary">
        Lire l'article
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  </Link>
);

const BlogPage = () => {
  usePageMeta({
    title: "Articles — Guides Twitch pour streamers",
    description:
      "Guides concrets, stratégies testées et analyses approfondies pour progresser sur Twitch.",
    canonical: "https://streamnco.fr/articles",
    ogUrl: "https://streamnco.fr/articles",
  });

  const [featured, ...rest] = ARTICLES;

  return (
    <div className="landing min-h-screen bg-background">
      <LandingNav />

      {/* Hero */}
      <SectionShell className="pt-32 md:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <SectionBadge>Blog</SectionBadge>
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl">
            Tout ce que tu dois savoir pour progresser sur Twitch
          </h1>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">
            Guides concrets, stratégies testées et analyses approfondies — sans bullshit, sans généralités.
          </p>
        </div>

        {/* Article grid */}
        <div className="mx-auto mt-16 max-w-5xl">
          {/* Featured */}
          <div className="mb-5 grid gap-5 md:grid-cols-2">
            <ArticleCard article={featured} featured />
          </div>

          {/* Rest */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </div>
      </SectionShell>

      {/* CTA strip */}
      <section className="border-t-2 border-foreground/10 bg-muted/30 py-16">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <p className="font-display text-2xl font-bold text-foreground">
            Prêt à diagnostiquer ta chaîne ?
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Entre ton pseudo Twitch et reçois ton StreamScore + priorité de la semaine en moins d'une minute.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            Analyser ma chaîne
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default BlogPage;
