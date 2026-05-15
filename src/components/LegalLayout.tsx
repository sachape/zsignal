import { ReactNode } from "react";
import LandingNav from "@/components/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

export const LegalLayout = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="min-h-screen bg-background">
    <LandingNav />
    <div className="pt-14">
      <div className="container mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
        <h1 className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
          {title}
        </h1>
        <div className="prose-legal mt-10 space-y-10">{children}</div>
      </div>
    </div>
    <LandingFooter />
  </div>
);

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

export const LegalPlaceholder = ({ label }: { label: string }) => (
  <span className="rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[11px] font-medium text-primary">
    [{label}]
  </span>
);
