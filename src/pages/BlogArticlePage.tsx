import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Clock, ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Container } from "@/components/site/el";
import { ARTICLES, getArticle } from "@/data/articles";
import { usePageMeta } from "@/hooks/usePageMeta";

const BlogArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const article = slug ? getArticle(slug) : undefined;
  const [readProgress, setReadProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug && !article) navigate("/articles", { replace: true });
  }, [slug, article, navigate]);

  const canonical = article ? `https://streamnco.fr/articles/${article.slug}` : undefined;
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
              logo: { "@type": "ImageObject", url: "https://streamnco.fr/favicon.ico" },
            },
          },
        }
      : null,
  );

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
    // `light` keeps the authored article prose (product tokens) readable on the
    // off-white editorial canvas; el-* chrome stays independent.
    <div className="light min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
      <div className="fixed left-0 top-0 z-[60] h-[2px] bg-el-ink transition-all duration-150 ease-out" style={{ width: `${readProgress}%` }} aria-hidden />

      <SiteNav />

      {/* Article hero */}
      <div className="pt-28 md:pt-36">
        <Container className="max-w-5xl">
          <nav className="mb-6 flex items-center gap-2 text-[13px] text-el-muted" aria-label="Fil d'Ariane">
            <Link to="/" className="hover:text-el-ink">Accueil</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/articles" className="hover:text-el-ink">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate text-el-body">{article.category}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-el-strong px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-el-ink">{article.category}</span>
            <span className="flex items-center gap-1.5 text-[13px] text-el-muted"><Clock className="h-3 w-3" /> {article.readingTime} min de lecture</span>
            <span className="text-[13px] text-el-muted">
              {new Date(article.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>

          <h1 className="mt-5 max-w-3xl font-el-display text-[clamp(2.2rem,4.5vw,3.25rem)] font-light leading-[1.1] tracking-[-0.03em] text-el-ink">
            {article.title}
          </h1>
          <p className="mt-4 max-w-2xl font-el-sans text-[18px] leading-[1.6] text-el-body">{article.excerpt}</p>

          <div className="mt-10 overflow-hidden rounded-2xl border border-el-hairline bg-el-canvas-soft p-6 md:p-10">
            <div className="opacity-90">{article.illustration}</div>
          </div>
        </Container>
      </div>

      {/* Body + TOC */}
      <Container className="max-w-5xl py-16 md:py-20">
        <div className="flex gap-16">
          <article ref={contentRef} className="min-w-0 flex-1" itemScope itemType="https://schema.org/Article">
            <meta itemProp="headline" content={article.title} />
            <meta itemProp="description" content={article.metaDescription} />
            <meta itemProp="datePublished" content={article.publishedAt} />
            <meta itemProp="publisher" content="Streamnco" />
            <div itemProp="articleBody">{article.content}</div>

            {/* In-article CTA */}
            <div className="relative mt-16 overflow-hidden rounded-2xl bg-el-dark p-8 text-el-on-dark">
              <p className="font-el-display text-[22px] font-light text-el-on-dark">Analyse ta chaîne maintenant</p>
              <p className="mt-2 font-el-sans text-[15px] text-el-on-dark-soft">
                Entre ton pseudo Twitch et reçois un diagnostic complet en moins d'une minute : StreamScore, blocage principal et priorité de la semaine.
              </p>
              <Link to="/" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-el-on-dark px-5 font-el-sans text-[15px] font-medium text-el-ink transition-opacity hover:opacity-90">
                Analyser ma chaîne gratuitement <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Prev / Next */}
            <div className="mt-12 grid grid-cols-2 gap-4">
              {prevArticle ? (
                <Link to={`/articles/${prevArticle.slug}`} className="group flex items-center gap-3 rounded-xl border border-el-hairline bg-el-card p-4 transition-colors hover:border-el-hairline-strong">
                  <ArrowLeft className="h-4 w-4 shrink-0 text-el-muted transition-transform group-hover:-translate-x-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-el-muted">Précédent</p>
                    <p className="mt-0.5 truncate font-el-sans text-[14px] font-medium text-el-ink">{prevArticle.title}</p>
                  </div>
                </Link>
              ) : <div />}
              {nextArticle ? (
                <Link to={`/articles/${nextArticle.slug}`} className="group flex items-center justify-end gap-3 rounded-xl border border-el-hairline bg-el-card p-4 text-right transition-colors hover:border-el-hairline-strong">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-el-muted">Suivant</p>
                    <p className="mt-0.5 truncate font-el-sans text-[14px] font-medium text-el-ink">{nextArticle.title}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-el-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : <div />}
            </div>
          </article>

          {/* TOC */}
          <aside className="hidden w-56 shrink-0 xl:block">
            <div className="sticky top-28">
              <p className="mb-4 font-el-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-el-muted">Dans cet article</p>
              <nav className="space-y-1" aria-label="Table des matières">
                {article.tableOfContents.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`block rounded-lg px-3 py-1.5 font-el-sans text-[13px] transition-colors ${
                      activeSection === item.id ? "bg-el-strong font-medium text-el-ink" : "text-el-muted hover:text-el-ink"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-10 rounded-xl border border-el-hairline bg-el-card p-4">
                <p className="font-el-sans text-[13px] font-medium text-el-ink">Diagnostique ta chaîne</p>
                <p className="mt-1 font-el-sans text-[12px] text-el-body">StreamScore + plan de la semaine en 1 min.</p>
                <Link to="/" className="mt-3 block rounded-full bg-el-ink px-3 py-2 text-center font-el-sans text-[12px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft">
                  Analyser ma chaîne
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related */}
        <div className="mt-20 border-t border-el-hairline pt-14">
          <p className="mb-8 font-el-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-el-muted">Autres articles</p>
          <div className="grid gap-5 sm:grid-cols-3">
            {relatedArticles.map((a) => (
              <Link key={a.slug} to={`/articles/${a.slug}`} className="group flex flex-col gap-3 rounded-xl border border-el-hairline bg-el-card p-5 transition-colors hover:border-el-hairline-strong">
                <span className="self-start rounded-full bg-el-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-el-ink">{a.category}</span>
                <p className="font-el-sans text-[15px] font-medium leading-snug text-el-ink">{a.title}</p>
                <span className="flex items-center gap-1 text-[12px] text-el-muted"><Clock className="h-3 w-3" /> {a.readingTime} min</span>
              </Link>
            ))}
          </div>
        </div>
      </Container>

      <SiteFooter />
    </div>
  );
};

export default BlogArticlePage;
