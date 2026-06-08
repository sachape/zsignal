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
    <div className="landing min-h-screen bg-background">
      {/* Reading progress */}
      <div
        className="fixed left-0 top-0 z-[60] h-[2px] bg-primary transition-all duration-150 ease-out"
        style={{ width: `${readProgress}%` }}
        aria-hidden
      />

      <LandingNav />

      {/* Article hero */}
      <div className="relative overflow-hidden pt-24 pb-0 md:pt-32">
        <div className="container relative mx-auto max-w-5xl px-4 md:px-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Fil d'Ariane">
            <Link to="/" className="transition-colors hover:text-foreground">Accueil</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/articles" className="transition-colors hover:text-foreground">Articles</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate text-foreground/70">{article.category}</span>
          </nav>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-foreground px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-background">
              {article.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {article.readingTime} min de lecture
            </span>
            <span className="text-xs text-muted-foreground/60">
              {new Date(article.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            {article.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {article.excerpt}
          </p>

          {/* Illustration — fond sombre pour que les SVG ressortent */}
          <div className="mt-10 overflow-hidden rounded-2xl border-2 border-foreground/80" style={{ boxShadow: "4px 4px 0 0 rgba(23,29,46,0.7)" }}>
            <div className="bg-black p-6 md:p-10 opacity-95">
              {article.illustration}
            </div>
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
            <div className="relative mt-16 overflow-hidden rounded-2xl border-2 border-foreground/80 bg-foreground p-8" style={{ boxShadow: "6px 6px 0 0 hsl(var(--primary))" }}>
              <p className="font-display text-xl font-bold text-background">Analyse ta chaîne maintenant</p>
              <p className="mt-2 text-sm text-background/70">
                Entre ton pseudo Twitch et reçois un diagnostic complet en moins d'une minute : StreamScore,
                blocage principal et priorité de la semaine.
              </p>
              <Link
                to="/"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
              >
                Analyser ma chaîne gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Prev / Next */}
            <div className="mt-12 grid grid-cols-2 gap-4">
              {prevArticle ? (
                <Link
                  to={`/articles/${prevArticle.slug}`}
                  className="group flex items-center gap-3 rounded-xl border-2 border-foreground/70 bg-card p-4 transition-all hover:-translate-x-px hover:-translate-y-px"
                  style={{ boxShadow: "3px 3px 0 0 rgba(23,29,46,0.6)" }}
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
                  to={`/articles/${nextArticle.slug}`}
                  className="group flex items-center justify-end gap-3 rounded-xl border-2 border-foreground/70 bg-card p-4 text-right transition-all hover:-translate-x-px hover:-translate-y-px"
                  style={{ boxShadow: "3px 3px 0 0 rgba(23,29,46,0.6)" }}
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
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
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
              <div className="mt-10 rounded-xl border-2 border-foreground/70 bg-card p-4" style={{ boxShadow: "3px 3px 0 0 hsl(var(--primary))" }}>
                <p className="text-xs font-bold text-foreground">Diagnostique ta chaîne</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  StreamScore + plan de la semaine en 1 min.
                </p>
                <Link
                  to="/"
                  className="mt-3 block rounded-lg bg-primary px-3 py-1.5 text-center text-[11px] font-bold text-primary-foreground transition-all hover:brightness-110"
                >
                  Analyser ma chaîne →
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related articles */}
        <div className="mt-20 border-t-2 border-foreground/10 pt-14">
          <p className="mb-8 font-display text-xl font-bold text-foreground">
            Autres articles
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {relatedArticles.map((a) => (
              <Link
                key={a.slug}
                to={`/articles/${a.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border-2 border-foreground/70 bg-card transition-all hover:-translate-x-px hover:-translate-y-px"
                style={{ boxShadow: "3px 3px 0 0 rgba(23,29,46,0.6)" }}
              >
                {/* Mini illustration */}
                <div className="h-24 overflow-hidden border-b-2 border-foreground/10 bg-black opacity-90 flex items-center justify-center p-4">
                  {a.illustration}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <span className="self-start rounded-full bg-foreground px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-background">
                    {a.category}
                  </span>
                  <p className="text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {a.title}
                  </p>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" /> {a.readingTime} min
                  </span>
                </div>
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
