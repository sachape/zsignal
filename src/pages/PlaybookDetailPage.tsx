import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import PlaybookCard from "@/components/PlaybookCard";
import { Button } from "@/components/ui/button";
import EmptyReportState from "@/components/EmptyReportState";
import { getPlaybookBySlug } from "@/services/playbookLibrary";

const PlaybookDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const playbook = slug ? getPlaybookBySlug(slug) : null;

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
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/playbooks">
            <ArrowLeft className="h-3.5 w-3.5" /> Tous les playbooks
          </Link>
        </Button>
        <PageHeader eyebrow="Playbook" title={playbook.title} description={playbook.summary} />
        <PlaybookCard playbook={playbook} expanded />
      </PageContainer>
    </AppShell>
  );
};

export default PlaybookDetailPage;
