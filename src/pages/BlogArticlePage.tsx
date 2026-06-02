import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Clock, ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import LandingNav from "@/components/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ARTICLES, getArticle } from "@/data/articles";
import { usePageMeta } from "@/hooks/usePageMeta";

const CATEGORY_COLORS: Record<string, string> = {
  Croissance: "border-primary/30 bg-primary/10 text-primary",
  Affiliation: "border-accent/30 bg-accent/10 text-accent",
  Stratégie: "border-primary/30 bg-primary/10 text-primary",
  Outils: "border-info/30 bg-info/10 text-info",
  Analytics: "border-info/30 bg-info/10 text-info",
};

const BlogArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const article = slug ? getArticle(slug) : undefined;
  const [readProgress, setReadProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Redirect 404
  useEffect(() => {
    if (slug && !article) navigate("/articles", { replace: true });
  }, [slug, article, navigate]);

  // Per-route meta + Article JSON-LD
  const canonical = article
    ? `https://streamnco.fr/articles/${article.slug}`
    : undefined;
  usePageMeta(
    article
      ? {
          title: article.title,
          description: article.metaDescription,
          ogType: "article",
          canonical,
          ogUrl: canonical,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.metaDescription,
            datePublished: article.publishedAt,
            inLanguage: "fr-FR",
            keywords: article.keywords.join(", "),
            mainEntityOfPage: canonical,
            author: { "@type": "Organization", name: "Streamnco" },
            publisher: {
              "@type": "Organization",
              name: "Streamnco",
              logo: {
                "@type": "ImageObject",
                url: "https://streamnco.fr/favicon.ico",
              },
            },
          },
        }
      : null,
  );

  // Reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight;
      const scrolled = Math.max(0, -rect.top);
      setReadProgress(Math.min(100, (scrolled / total) * 100));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active TOC section
  useEffect(() => {
    if (!article) return;
    const ids = article.tableOfContents.map((t) => t.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveSection(e.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [article]);

  if (!article) return null;

  const currentIndex = ARTICLES.findIndex((a) => a.slug === article.slug);
  const prevArticle = currentIndex > 0 ? ARTICLES[currentIndex - 1] : null;
  const nextArticle = currentIndex < ARTICLES.length - 1 ? ARTICLES[currentIndex + 1] : null;
  const relatedArticles = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* Reading progress */}
      <div
        className="fixed left-0 top-0 z-[60] h-[2px] bg-primary transition-all duration-150 ease-out"
        style={{ width: `${readProgress}%` }}
        aria-hidden
      />

      <LandingNav />

      {/* Article hero */}
      <div className="relative overflow-hidden pt-24 pb-0 md:pt-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_55%)]" />
        <div className="container relative mx-auto max-w-5xl px-4 md:px-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground/50" aria-label="Fil d'Ariane">
            <Link to="/" className="transition-colors hover:text-muted-foreground">Accueil</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/blog" className="transition-colors hover:text-muted-foreground">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate text-muted-foreground/80">{article.category}</span>
          </nav>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[article.category] ?? "border-border/40 bg-muted/30 text-muted-foreground"}`}>
              {article.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <Clock className="h-3 w-3" /> {article.readingTime} min de lecture
            </span>
            <span className="text-xs text-muted-foreground/40">
              {new Date(article.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-[42px] md:leading-[1.15]">
            {article.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {article.excerpt}
          </p>

          {/* Illustration */}
          <div className="relative mt-10 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-xl">
            <div className="p-6 md:p-10 opacity-90">
              {article.illustration}
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-background/60" />
          </div>
        </div>
      </div>

      {/* Body: content + TOC */}
      <div className="container mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-20">
        <div className="flex gap-16">
          {/* Article content */}
          <article
            ref={contentRef}
            className="min-w-0 flex-1"
            itemScope
            itemType="https://schema.org/Article"
          >
            <meta itemProp="headline" content={article.title} />
            <meta itemProp="description" content={article.metaDescription} />
            <meta itemProp="datePublished" content={article.publishedAt} />
            <meta itemProp="publisher" content="Streamnco" />

            <div itemProp="articleBody">
              {article.content}
            </div>

            {/* In-article CTA */}
            <div className="mt-16 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] to-primary/[0.03] p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_55%)]" />
              <p className="text-lg font-bold text-foreground">Analyse ta chaîne maintenant</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Entre ton pseudo Twitch et reçois un diagnostic complet en moins d'une minute : StreamScore,
                blocage principal et priorité de la semaine.
              </p>
              <Link
                to="/"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                Analyser ma chaîne gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Prev / Next */}
            <div className="mt-12 grid grid-cols-2 gap-4">
              {prevArticle ? (
                <Link
                  to={`/blog/${prevArticle.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-card/40 p-4 transition-all hover:border-white/[0.12]"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Précédent</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground group-hover:text-primary">
                      {prevArticle.title}
                    </p>
                  </div>
                </Link>
              ) : <div />}
              {nextArticle ? (
                <Link
                  to={`/blog/${nextArticle.slug}`}
                  className="group flex items-center justify-end gap-3 rounded-xl border border-white/[0.06] bg-card/40 p-4 text-right transition-all hover:border-white/[0.12]"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Suivant</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground group-hover:text-primary">
                      {nextArticle.title}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : <div />}
            </div>
          </article>

          {/* Sticky TOC — desktop only */}
          <aside className="hidden w-56 shrink-0 xl:block">
            <div className="sticky top-28">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">
                Dans cet article
              </p>
              <nav className="space-y-1.5" aria-label="Table des matières">
                {article.tableOfContents.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`block rounded-lg px-3 py-1.5 text-[13px] transition-all ${
                      activeSection === item.id
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              {/* Mini CTA */}
              <div className="mt-10 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                <p className="text-xs font-semibold text-foreground">Diagnostique ta chaîne</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  StreamScore + plan de la semaine en 1 min.
                </p>
                <Link
                  to="/"
                  className="mt-3 block rounded-lg bg-primary px-3 py-1.5 text-center text-[11px] font-semibold text-primary-foreground transition-all hover:brightness-110"
                >
                  Analyser ma chaîne →
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related articles */}
        <div className="mt-20 border-t border-white/[0.06] pt-14">
          <p className="mb-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">
            Autres articles
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {relatedArticles.map((a) => (
              <Link
                key={a.slug}
                to={`/blog/${a.slug}`}
                className="group flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-card/40 p-5 transition-all hover:border-white/[0.12]"
              >
                <span className={`self-start rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[a.category] ?? "border-border/40 bg-muted/30 text-muted-foreground"}`}>
                  {a.category}
                </span>
                <p className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary/90 transition-colors">
                  {a.title}
                </p>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                  <Clock className="h-2.5 w-2.5" /> {a.readingTime} min
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
};

export default BlogArticlePage;
