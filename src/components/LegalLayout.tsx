import { ReactNode } from "react";
import LandingNav from "@/components/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
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
  <div className="min-h-screen bg-background">
    <LandingNav />
    <section className="relative overflow-hidden pt-28 md:pt-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[48rem] -translate-x-1/2 landing-aurora opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] opacity-40"
        aria-hidden
      />
      <div className="container relative mx-auto max-w-3xl px-4 md:px-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-strong shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
          Légal
        </span>
        <h1 className="font-display mt-4 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl">
          {title}
        </h1>
      </div>
    </section>
    <div className="container relative mx-auto max-w-3xl px-4 pb-20 pt-10 md:px-6 md:pb-28">
      <div className="prose-legal space-y-4">{children}</div>
    </div>
    <LandingFooter />
  </div>
  );
};

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-white/[0.06] bg-card/40 p-5 backdrop-blur-sm md:p-6">
    <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

export const LegalPlaceholder = ({ label }: { label: string }) => (
  <span className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[11px] font-medium text-primary-strong">
    [{label}]
  </span>
);
