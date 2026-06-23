import { useState, useEffect } from "react";
import { Sparkles, Lock } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import PlaybookCard from "@/components/PlaybookCard";
import { PLAYBOOKS, getRecommendedPlaybooks, type PlaybookTag } from "@/services/playbookLibrary";
import { getLatestReport } from "@/services/reportRepository";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { usePageMeta } from "@/hooks/usePageMeta";
import { FullPageLock, InlineLock } from "@/components/PaywallGate";
import { cn } from "@/lib/utils";
import type { Playbook } from "@/services/playbookLibrary";

const FREE_PLAYBOOK_SLUGS = ["twitch-bio-clarity", "stable-schedule"];

const ALL_TAGS: { tag: PlaybookTag | "all"; label: string }[] = [
  { tag: "all", label: "Tous" },
  { tag: "clarity", label: "Clarté" },
  { tag: "schedule", label: "Planning" },
  { tag: "clips", label: "Clips" },
  { tag: "titles", label: "Titres" },
  { tag: "category", label: "Catégorie" },
  { tag: "structure", label: "Structure" },
  { tag: "community", label: "Communauté" },
  { tag: "monetization", label: "Monétisation" },
];

const PlaybooksPage = () => {
  const { user } = useAuth();
  const { isPro } = usePlan();
  const [filter, setFilter] = useState<PlaybookTag | "all">("all");
  const [recommended, setRecommended] = useState<Playbook[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getLatestReport(user.id).then((saved) => {
      if (cancelled || !saved) return;
      setRecommended(getRecommendedPlaybooks(saved.report, 3));
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const allFiltered = filter === "all" ? PLAYBOOKS : PLAYBOOKS.filter((p) => p.tags.includes(filter));
  const freeFiltered = allFiltered.filter((p) => FREE_PLAYBOOK_SLUGS.includes(p.slug));
  const lockedFiltered = allFiltered.filter((p) => !FREE_PLAYBOOK_SLUGS.includes(p.slug));
  const filtered = isPro ? allFiltered : freeFiltered;

  usePageMeta({
    title: "Playbooks",
    description: "Des guides courts et concrets pour appliquer les recommandations de ton plan.",
    canonical: "https://streamnco.fr/playbooks",
    ogUrl: "https://streamnco.fr/playbooks",
    robots: "index, follow",
  });

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Exécution"
          title="Playbooks"
          description="Des guides courts et concrets pour appliquer les recommandations de ton plan."
        />

        {/* Recommended section */}
        {recommended.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary-strong" aria-hidden />
              <h2 className="text-sm font-semibold text-foreground">Recommandé pour toi</h2>
              {!isPro && <Lock className="h-3 w-3 text-muted-foreground/40" />}
              <span className="text-[11px] text-muted-foreground">
                basé sur tes dimensions les plus faibles
              </span>
            </div>
            {isPro ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.map((p) => (
                  <PlaybookCard key={p.slug} playbook={p} highlighted />
                ))}
              </div>
            ) : (
              <InlineLock
                feature="Playbooks recommandés — Pro"
                description="Streamnco sélectionne automatiquement les guides les plus pertinents selon tes points faibles."
                blurHeight="140px"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recommended.map((p) => (
                    <PlaybookCard key={p.slug} playbook={p} highlighted />
                  ))}
                </div>
              </InlineLock>
            )}
            <div className="mt-6 h-px w-full bg-border/40" />
          </div>
        )}

        {/* Filters — scrollable on mobile, wrapped on desktop */}
        <div className="-mx-4 mb-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
          <div className="flex gap-2 sm:flex-wrap">
          {ALL_TAGS.map((t) => {
            const count =
              t.tag === "all"
                ? PLAYBOOKS.length
                : PLAYBOOKS.filter((p) => p.tags.includes(t.tag as PlaybookTag)).length;
            return (
              <button
                key={t.tag}
                onClick={() => setFilter(t.tag)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filter === t.tag
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] font-semibold",
                    filter === t.tag
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background/60 text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
          </div>
        </div>

        {/* Grid — free playbooks */}
        {filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((p) => (
              <PlaybookCard key={p.slug} playbook={p} />
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Aucun playbook gratuit dans cette catégorie.
          </p>
        )}

        {/* Locked playbooks preview */}
        {!isPro && lockedFiltered.length > 0 && (
          <div className="mt-4">
            <InlineLock
              feature={`${lockedFiltered.length} playbook${lockedFiltered.length > 1 ? "s" : ""} supplémentaire${lockedFiltered.length > 1 ? "s" : ""} — Pro`}
              description="Guides avancés sur les clips, le chat, le Discord, la monétisation et plus."
              blurHeight="160px"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {lockedFiltered.map((p) => (
                  <PlaybookCard key={p.slug} playbook={p} />
                ))}
              </div>
            </InlineLock>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default PlaybooksPage;
