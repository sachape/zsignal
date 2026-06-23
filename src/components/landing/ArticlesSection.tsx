import { Link } from "react-router-dom";
import { ArrowRight, Clock, BookOpen } from "lucide-react";
import { ARTICLES } from "@/data/articles";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { SectionShell, SectionHeading, SectionBadge } from "./primitives";

const CATEGORY_COLORS: Record<string, string> = {
  Croissance: "border-primary/30 bg-primary/10 text-primary-strong",
  Affiliation: "border-primary/25 bg-primary/[0.08] text-primary-strong/80",
  Stratégie: "border-primary/30 bg-primary/10 text-primary-strong",
  Outils: "border-foreground/15 bg-foreground/[0.05] text-foreground/60",
  Analytics: "border-foreground/15 bg-foreground/[0.05] text-foreground/60",
  Produit: "border-primary/30 bg-primary/10 text-primary-strong",
};

const FEATURED_ARTICLES = ARTICLES.slice(0, 3);

const ArticleCard = ({
  article,
  delay,
  inView,
}: {
  article: (typeof ARTICLES)[number];
  delay: number;
  inView: boolean;
}) => (
  <Link
    to={`/articles/${article.slug}`}
    className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-[0_12px_48px_hsl(var(--primary)/0.10)]"
    style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, box-shadow 300ms ease, border-color 300ms ease, translate 300ms ease`,
    }}
  >
    {/* Ambient glow */}
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.06),transparent_60%)]" />

    {/* Illustration strip */}
    <div className="relative h-36 overflow-hidden border-b border-white/[0.05] bg-card/60">
      <div className="absolute inset-0 flex items-center justify-center p-6 opacity-75 transition-opacity duration-300 group-hover:opacity-90">
        {article.illustration}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
      {/* Category badge overlaid */}
      <div className="absolute bottom-3 left-4">
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm ${CATEGORY_COLORS[article.category] ?? "border-border/40 bg-muted/30 text-muted-foreground"}`}
        >
          {article.category}
        </span>
      </div>
    </div>

    {/* Content */}
    <div className="relative flex flex-1 flex-col p-5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
        <Clock className="h-2.5 w-2.5" />
        {article.readingTime} min de lecture
      </div>

      <h3 className="mt-2.5 text-sm font-bold leading-snug tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary-strong/90 line-clamp-2">
        {article.title}
      </h3>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground/60 line-clamp-3">
        {article.excerpt}
      </p>

      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-muted-foreground/60 transition-colors duration-200 group-hover:text-primary-strong">
        Lire l'article
        <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>
    </div>
  </Link>
);

const ArticlesSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.15);

  return (
    <SectionShell id="articles" glow grid>
      <div ref={ref}>
        <SectionHeading
          badge={
            <>
              <BookOpen className="h-3 w-3" />
              Articles & ressources
            </>
          }
          title="Apprends à lire ta chaîne"
          subtitle="Des guides concrets pour comprendre ce qui bloque, ce qui progresse, et ce qu'il faut corriger en premier."
        />

        <div
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Articles récents"
        >
          {FEATURED_ARTICLES.map((article, i) => (
            <ArticleCard
              key={article.slug}
              article={article}
              delay={i * 100}
              inView={inView}
            />
          ))}
        </div>

        {/* CTA */}
        <div
          className="mt-10 flex justify-center"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1) 400ms, transform 700ms cubic-bezier(0.16,1,0.3,1) 400ms",
          }}
        >
          <Link
            to="/articles"
            className="group inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.06] px-6 py-2.5 text-sm font-semibold text-primary-strong transition-all duration-200 hover:bg-primary/10 hover:border-primary/40 hover:shadow-[0_0_24px_hsl(var(--primary)/0.2)]"
          >
            Voir tous les articles
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </SectionShell>
  );
};

export default ArticlesSection;
