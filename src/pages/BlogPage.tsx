import { Link } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Container, Orb, Eyebrow, Reveal } from "@/components/site/el";
import { ARTICLES } from "@/data/articles";
import { usePageMeta } from "@/hooks/usePageMeta";

const ArticleCard = ({ article, featured = false }: { article: typeof ARTICLES[number]; featured?: boolean }) => (
  <Link
    to={`/articles/${article.slug}`}
    className={`group flex flex-col overflow-hidden rounded-2xl border border-el-hairline bg-el-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.18)] ${featured ? "md:col-span-2" : ""}`}
  >
    <div className={`relative flex items-center justify-center overflow-hidden border-b border-el-hairline bg-el-canvas-soft p-6 ${featured ? "h-52 md:h-64" : "h-40"}`}>
      <div className="opacity-90">{article.illustration}</div>
    </div>
    <div className="flex flex-1 flex-col p-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full bg-el-strong px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-el-ink">
          {article.category}
        </span>
        <span className="flex items-center gap-1 text-[12px] text-el-muted">
          <Clock className="h-3 w-3" /> {article.readingTime} min
        </span>
      </div>
      <h2 className={`mt-3 font-el-display font-light leading-[1.2] tracking-[-0.01em] text-el-ink ${featured ? "text-[26px]" : "text-[20px]"}`}>
        {article.title}
      </h2>
      <p className="mt-2 flex-1 font-el-sans text-[15px] leading-[1.6] text-el-body">{article.excerpt}</p>
      <div className="mt-4 flex items-center gap-1.5 font-el-sans text-[14px] font-medium text-el-ink">
        Lire l'article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  </Link>
);

const BlogPage = () => {
  usePageMeta({
    title: "Articles — Guides Twitch pour streamers",
    description: "Guides concrets, stratégies testées et analyses approfondies pour progresser sur Twitch.",
    canonical: "https://streamnco.fr/articles",
    ogUrl: "https://streamnco.fr/articles",
  });

  const [featured, ...rest] = ARTICLES;

  return (
    <div className="min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
      <SiteNav />

      <section className="relative overflow-hidden pt-36 pb-8 md:pt-44">
        <Orb color="bg-el-peach" className="left-1/4 top-10 h-[24rem] w-[24rem] opacity-50" />
        <Orb color="bg-el-sky" className="right-[-6rem] top-20 h-[22rem] w-[22rem] opacity-50" animate="fast" />
        <Container className="relative text-center">
          <Reveal>
            <Eyebrow className="justify-center">Blog</Eyebrow>
            <h1 className="mx-auto mt-5 max-w-3xl font-el-display text-[clamp(2rem,5.5vw,4rem)] font-light leading-[1.05] tracking-[-0.03em] text-el-ink">
              Tout ce qu'il faut savoir pour progresser sur Twitch
            </h1>
            <p className="mx-auto mt-5 max-w-xl font-el-sans text-[17px] leading-[1.6] text-el-body">
              Guides concrets, stratégies testées et analyses approfondies — sans bullshit, sans généralités.
            </p>
          </Reveal>
        </Container>
      </section>

      <Container className="pb-20">
        <div className="mx-auto max-w-5xl">
          {featured && (
            <div className="mb-5 grid gap-5 md:grid-cols-2">
              <ArticleCard article={featured} featured />
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </div>
      </Container>

      {/* CTA */}
      <section className="relative overflow-hidden bg-el-dark py-20">
        <Orb color="bg-el-lavender" className="left-[-6rem] top-0 h-[22rem] w-[22rem] opacity-25" />
        <Container className="relative text-center">
          <h2 className="mx-auto max-w-2xl font-el-display text-[clamp(1.9rem,4vw,2.75rem)] font-light leading-[1.1] tracking-[-0.02em] text-el-on-dark">
            Prêt à diagnostiquer ta chaîne ?
          </h2>
          <p className="mx-auto mt-3 max-w-md font-el-sans text-[16px] text-el-on-dark-soft">
            Entre ton pseudo Twitch et reçois ton StreamScore + ta priorité de la semaine en moins d'une minute.
          </p>
          <Link to="/" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-el-on-dark px-7 font-el-sans text-[16px] font-medium text-el-ink transition-opacity hover:opacity-90">
            Analyser ma chaîne <ArrowRight className="h-4 w-4" />
          </Link>
        </Container>
      </section>

      <SiteFooter />
    </div>
  );
};

export default BlogPage;
