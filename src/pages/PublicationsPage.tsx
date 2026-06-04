import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format as formatDate } from "date-fns";
import { fr } from "date-fns/locale";
import { Camera, Clock, Loader2, Plus, Send, AlertTriangle, FileText, ExternalLink, CheckCircle2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSocialPosts, type SocialStatus } from "@/hooks/useSocialPosts";
import { useContentItems } from "@/hooks/useContentItems";

const STATUS_META: Record<SocialStatus, { label: string; cls: string }> = {
  draft:      { label: "Brouillon",  cls: "border-border bg-muted text-muted-foreground" },
  scheduled:  { label: "Planifié",   cls: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  publishing: { label: "Publication…", cls: "border-violet-500/40 bg-violet-500/10 text-violet-300" },
  published:  { label: "Publié",     cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  failed:     { label: "Échec",      cls: "border-destructive/40 bg-destructive/10 text-destructive" },
};

const FORMAT_LABEL: Record<string, string> = {
  post: "Post",
  reel: "Reel",
  story: "Story",
};

const PLATFORM_LABEL_MANUAL: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  other: "Autre",
};

const PublicationsPage = () => {
  const navigate = useNavigate();
  const { posts, loading } = useSocialPosts();
  const { items: contentItems, loading: loadingItems } = useContentItems();

  const manualPublished = useMemo(
    () => contentItems
      .filter((i) => i.status === "published_manually")
      .sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      }),
    [contentItems],
  );

  const grouped = useMemo(() => {
    return {
      drafts: posts.filter((p) => p.status === "draft"),
      scheduled: posts.filter((p) => p.status === "scheduled"),
      published: posts.filter((p) => p.status === "published"),
      failed: posts.filter((p) => p.status === "failed"),
    };
  }, [posts]);

  const isEmpty = !loading && !loadingItems && posts.length === 0 && manualPublished.length === 0;

  return (
    <AppShell>
      <PageContainer size="lg">
        <PageHeader
          eyebrow="Content Studio"
          title="Publications"
          description="Tes brouillons, planifications et publications Instagram."
          action={
            <Button onClick={() => navigate("/composer")}>
              <Plus className="h-4 w-4" />
              Nouvelle publication
            </Button>
          }
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Camera className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="font-semibold">Aucune publication pour l'instant</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Crée ta première publication Instagram depuis le Composer.
                </p>
              </div>
              <Button onClick={() => navigate("/composer")}>
                <Plus className="h-4 w-4" />
                Ouvrir le Composer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 mt-6">
            <Section title="Brouillons" icon={FileText} items={grouped.drafts} />
            <Section title="Planifiés" icon={Clock} items={grouped.scheduled} />
            <Section title="Publiés" icon={Send} items={grouped.published} />
            <Section title="Échecs" icon={AlertTriangle} items={grouped.failed} />
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

interface SectionProps {
  title: string;
  icon: typeof Camera;
  items: ReturnType<typeof useSocialPosts>["posts"];
}

const Section = ({ title, icon: Icon, items }: SectionProps) => {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px]">{items.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((p) => (
          <Link
            key={p.id}
            to={`/composer?id=${p.id}`}
            className="group rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-primary/40"
          >
            <div className="aspect-[4/5] bg-muted/30 relative">
              {p.media_url ? (
                p.media_mime_type?.startsWith("video") ? (
                  <video src={p.media_url} className="h-full w-full object-cover" muted />
                ) : (
                  <img src={p.media_url} alt="" className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Sans média
                </div>
              )}
              <div className="absolute top-2 left-2 flex gap-1.5">
                <Badge variant="outline" className={cn("text-[10px]", STATUS_META[p.status].cls)}>
                  {STATUS_META[p.status].label}
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-background/80">
                  {FORMAT_LABEL[p.format] ?? p.format}
                </Badge>
              </div>
            </div>
            <div className="p-3">
              <div className="line-clamp-2 text-xs text-foreground/90">
                {p.caption || <span className="text-muted-foreground italic">Sans caption</span>}
              </div>
              <div className="mt-1.5 text-[10px] text-muted-foreground">
                {p.scheduled_at
                  ? `Planifié le ${formatDate(new Date(p.scheduled_at), "dd MMM yyyy HH:mm", { locale: fr })}`
                  : formatDate(new Date(p.updated_at), "dd MMM yyyy", { locale: fr })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PublicationsPage;
