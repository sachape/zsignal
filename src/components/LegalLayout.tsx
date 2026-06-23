import { ReactNode } from "react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Container, Orb, Eyebrow } from "@/components/site/el";
import { usePageMeta } from "@/hooks/usePageMeta";

export const LegalLayout = ({
  title,
  children,
  canonicalPath,
  description,
}: {
  title: string;
  children: ReactNode;
  canonicalPath?: string;
  description?: string;
}) => {
  usePageMeta(
    canonicalPath
      ? {
          title,
          description,
          canonical: `https://streamnco.fr${canonicalPath}`,
          ogUrl: `https://streamnco.fr${canonicalPath}`,
          robots: "index, follow",
        }
      : null,
  );
  return (
  <div className="min-h-screen bg-el-canvas font-el-sans text-el-ink antialiased">
    <SiteNav />
    <section className="relative overflow-hidden pt-36 md:pt-44">
      <Orb color="bg-el-mint" className="left-1/4 top-8 h-[22rem] w-[22rem] opacity-40" />
      <Container className="relative max-w-3xl">
        <Eyebrow>Légal</Eyebrow>
        <h1 className="mt-4 font-el-display text-[clamp(2.2rem,5vw,3.25rem)] font-light leading-[1.06] tracking-[-0.03em] text-el-ink">
          {title}
        </h1>
      </Container>
    </section>
    <Container className="max-w-3xl pb-24 pt-10">
      <div className="prose-legal space-y-4">{children}</div>
    </Container>
    <SiteFooter />
  </div>
  );
};

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-el-hairline bg-el-card p-6 md:p-7">
    <h2 className="mb-4 font-el-display text-[20px] font-light tracking-[-0.01em] text-el-ink">{title}</h2>
    <div className="space-y-3 font-el-sans text-[15px] leading-[1.65] text-el-body">{children}</div>
  </section>
);

export const LegalPlaceholder = ({ label }: { label: string }) => (
  <span className="rounded border border-el-hairline-strong bg-el-strong px-1.5 py-0.5 text-[12px] font-medium text-el-ink">
    [{label}]
  </span>
);
