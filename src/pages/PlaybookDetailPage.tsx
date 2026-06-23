import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Lightbulb,
  Zap,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import EmptyReportState from "@/components/EmptyReportState";
import { getPlaybookBySlug, getRelatedPlaybooks } from "@/services/playbookLibrary";
import { usePageMeta } from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";

// ── Difficulty / Impact badges ────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: "easy" | "medium" | "hard" }) {
  const config = {
    easy: { label: "Facile", color: "text-success bg-success/10 border-success/20" },
    medium: { label: "Moyen", color: "text-warning bg-warning/10 border-warning/20" },
    hard: { label: "Avancé", color: "text-destructive bg-destructive/10 border-destructive/20" },
  }[difficulty];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", config.color)}>
      {config.label}
    </span>
  );
}

function ImpactBadge({ impact }: { impact: "medium" | "high" }) {
  const config = {
    medium: { label: "Impact moyen", color: "text-muted-foreground bg-muted/60 border-border/60" },
    high: { label: "Fort impact", color: "text-primary-strong bg-primary/10 border-primary/20" },
  }[impact];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", config.color)}>
      {config.label}
    </span>
  );
}

// ── Related playbook card ────────────────────────────────────────────────────

function RelatedCard({ slug, title, summary, timeMinutes }: {
  slug: string; title: string; summary: string; timeMinutes: number;
}) {
  return (
    <Link
      to={`/playbooks/${slug}`}
      className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-card/30 p-4 transition-colors hover:border-primary/20 hover:bg-card/50"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 transition-colors group-hover:bg-primary/10">
        <BookOpen className="h-4 w-4 text-accent transition-colors group-hover:text-primary-strong" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{summary}</p>
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" /> {timeMinutes} min
        </div>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary-strong/60" />
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const PlaybookDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const playbook = slug ? getPlaybookBySlug(slug) : null;
  const related = playbook ? getRelatedPlaybooks(playbook, 2) : [];

  usePageMeta({
    title: playbook ? playbook.title : "Playbook",
    description: playbook?.summary,
  });

  if (!playbook) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <EmptyReportState
            title="Playbook introuvable"
            description="Ce guide n'existe pas ou n'est plus disponible."
            ctaLabel="Voir tous les playbooks"
            ctaHref="/playbooks"
          />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer size="sm">
        <PageBreadcrumb items={[{ label: playbook.title }]} />

        {/* ── Hero card ── */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-7 backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-primary/[0.08] blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-accent/[0.06] blur-2xl" aria-hidden />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-strong">
              <BookOpen className="h-3 w-3" /> Playbook
            </div>

            <h1 className="font-display mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {playbook.title}
            </h1>

            <p className="mb-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {playbook.summary}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <Clock className="h-3 w-3" /> {playbook.timeMinutes} min
              </span>
              <DifficultyBadge difficulty={playbook.difficulty} />
              <ImpactBadge impact={playbook.impact} />
            </div>
          </div>
        </div>

        {/* ── Key insight ── */}
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary-strong" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-strong">Insight clé</span>
          </div>
          <p className="text-sm font-semibold leading-relaxed text-foreground">
            "{playbook.keyInsight}"
          </p>
        </div>

        {/* ── Why it matters ── */}
        <div className="mb-8">
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Pourquoi ça compte
          </h2>
          <div className="rounded-xl border border-white/[0.06] bg-card/30 p-5">
            <p className="text-sm leading-relaxed text-foreground">{playbook.why}</p>
          </div>
        </div>

        {/* ── Steps timeline ── */}
        <div className="mb-8">
          <h2 className="mb-5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Les étapes — {playbook.steps.length} actions concrètes
          </h2>

          <div>
            {playbook.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                {/* Circle + connector */}
                <div className="flex flex-col items-center">
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground shadow-[0_0_20px_-4px] shadow-primary/50">
                    {i + 1}
                  </div>
                  {i < playbook.steps.length - 1 && (
                    <div className="my-1 min-h-5 w-px flex-1 bg-gradient-to-b from-primary/30 to-transparent" />
                  )}
                </div>

                {/* Content */}
                <div className={cn("min-w-0 flex-1", i < playbook.steps.length - 1 ? "pb-4" : "")}>
                  <div className="rounded-xl border border-white/[0.06] bg-card/30 px-4 py-3.5 transition-colors hover:border-white/[0.10] hover:bg-card/40">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-strong/50" />
                      <p className="text-sm leading-relaxed text-foreground">{step}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pro tip ── */}
        {playbook.proTip && (
          <div className="mb-8 rounded-2xl border border-accent/20 bg-accent/[0.05] p-5">
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Pro tip</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">{playbook.proTip}</p>
          </div>
        )}

        {/* ── Related playbooks ── */}
        {related.length > 0 && (
          <div>
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Playbooks liés
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map((p) => (
                <RelatedCard
                  key={p.slug}
                  slug={p.slug}
                  title={p.title}
                  summary={p.summary}
                  timeMinutes={p.timeMinutes}
                />
              ))}
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default PlaybookDetailPage;
