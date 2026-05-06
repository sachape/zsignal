import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import PlaybookCard from "@/components/PlaybookCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAYBOOKS, type PlaybookTag } from "@/services/playbookLibrary";
import { cn } from "@/lib/utils";

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
  const [filter, setFilter] = useState<PlaybookTag | "all">("all");
  const filtered = filter === "all" ? PLAYBOOKS : PLAYBOOKS.filter((p) => p.tags.includes(filter));

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Exécution"
          title="Playbooks"
          description="Des guides courts et concrets pour appliquer les recommandations de ton plan."
        />

        <div className="mb-6 flex flex-wrap gap-2">
          {ALL_TAGS.map((t) => (
            <button
              key={t.tag}
              onClick={() => setFilter(t.tag)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === t.tag
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((p) => (
            <PlaybookCard key={p.slug} playbook={p} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Aucun playbook dans cette catégorie pour l'instant.
          </p>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default PlaybooksPage;
