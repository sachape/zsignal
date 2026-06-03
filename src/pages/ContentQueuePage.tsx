import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Inbox, Filter, Copy, Trash2, CheckCircle2, Circle, Eye, EyeOff,
  Loader2, Sparkles, Pencil, Save, X, ExternalLink, Tv, Video, Music2, Camera, Clapperboard, Upload,
  Film, Wand2, Clock,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useContentItems, type ContentItem, type ContentPlatform,
  type ContentPriority, type ContentStatus,
} from "@/hooks/useContentItems";
import { useConnectedNetworks } from "@/hooks/useConnectedNetworks";
import YouTubeUploadDialog from "@/components/content-queue/YouTubeUploadDialog";

const PLATFORM_META: Record<ContentPlatform, { label: string; Icon: React.FC<{ className?: string }> }> = {
  youtube_shorts: { label: "YouTube Shorts", Icon: Video },
  tiktok: { label: "TikTok", Icon: Music2 },
  instagram: { label: "Instagram", Icon: Camera },
  twitch_clip: { label: "Clip Twitch", Icon: Tv },
  community: { label: "Communauté", Icon: Clapperboard },
};

const VIDEO_PLATFORMS: ContentPlatform[] = ["youtube_shorts", "tiktok", "instagram", "twitch_clip"];

const STATUS_META: Record<ContentStatus, { label: string; cls: string }> = {
  idea:               { label: "Idée",              cls: "border-border bg-muted text-muted-foreground" },
  to_produce:         { label: "À produire",        cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  to_generate:        { label: "À générer",         cls: "border-violet-500/40 bg-violet-500/10 text-violet-300" },
  generating:         { label: "Génération…",       cls: "border-violet-500/40 bg-violet-500/15 text-violet-200" },
  draft_ready:        { label: "Draft prêt",        cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
  ready:              { label: "Prêt à publier",    cls: "border-primary/40 bg-primary/10 text-primary" },
  uploaded:           { label: "Uploadé",           cls: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  published:          { label: "Publié",            cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  published_manually: { label: "Publié (manuel)",   cls: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200" },
  ignored:            { label: "Ignoré",            cls: "border-border/40 bg-muted/40 text-muted-foreground/60" },
};

const PRIORITY_META: Record<ContentPriority, { label: string; cls: string }> = {
  high: { label: "Élevée", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  medium: { label: "Moyenne", cls: "border-primary/40 bg-primary/10 text-primary" },
  low: { label: "Faible", cls: "border-border bg-muted text-muted-foreground" },
};

type FilterKey = "all" | ContentPlatform | "high" | "to_generate" | "draft_ready" | "ready" | "uploaded";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "youtube_shorts", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "twitch_clip", label: "Twitch" },
  { key: "community", label: "Communauté" },
  { key: "high", label: "Priorité élevée" },
  { key: "to_generate", label: "À générer" },
  { key: "draft_ready", label: "Draft prêt" },
  { key: "ready", label: "Prêt" },
  { key: "uploaded", label: "Uploadé" },
];

function copy(value: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success("Copié"),
    () => toast.error("Copie impossible"),
  );
}

function buildCopyPayload(item: ContentItem): string {
  const parts: string[] = [item.title];
  if (item.description) parts.push("", item.description);
  if (item.hashtags.length > 0) parts.push("", item.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" "));
  return parts.join("\n");
}

const ContentQueuePage = () => {
  const { items, loading, updateItem, deleteItem, refetch } = useContentItems();
  const { accounts } = useConnectedNetworks();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [hideIgnored, setHideIgnored] = useState(true);
  const [uploadItem, setUploadItem] = useState<ContentItem | null>(null);

  const youtubeAccount = accounts.find(a => a.platform === "youtube");
  const youtubeConnected = youtubeAccount?.connection_status === "connected";
  const goReconnectYouTube = () => navigate("/reseaux");

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (hideIgnored && i.status === "ignored") return false;
      if (filter === "all") return true;
      if (filter === "high") return i.priority === "high";
      if (filter === "to_generate") return i.status === "to_generate" || i.status === "generating";
      if (filter === "draft_ready") return i.status === "draft_ready";
      if (filter === "ready") return i.status === "ready";
      if (filter === "uploaded") return i.status === "uploaded" || !!i.youtube_video_id;
      return i.platform === filter;
    });
  }, [items, filter, hideIgnored]);

  const counts = useMemo(() => ({
    total: items.length,
    to_generate: items.filter(i => i.status === "to_generate" || i.status === "generating").length,
    draft_ready: items.filter(i => i.status === "draft_ready").length,
    ready: items.filter(i => i.status === "ready").length,
    published: items.filter(i => i.status === "published" || i.status === "published_manually").length,
  }), [items]);

  const [sourceItem, setSourceItem] = useState<ContentItem | null>(null);

  return (
    <AppShell>
      <PageContainer size="lg">
        <PageHeader
          eyebrow="Cockpit éditorial"
          title="Content Queue"
          description="Transforme chaque live en clips courts prêts à publier."
        />

        {/* Stats strip */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCell label="Total" value={counts.total} />
          <StatCell label="À générer" value={counts.to_generate} accent="violet" />
          <StatCell label="Drafts" value={counts.draft_ready} accent="cyan" />
          <StatCell label="Prêts" value={counts.ready} accent="primary" />
          <StatCell label="Publiés" value={counts.published} accent="emerald" />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {FILTERS.map(f => (
            <button
              key={f.key} type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                filter === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-border/80 text-muted-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHideIgnored(v => !v)}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-border/80"
          >
            {hideIgnored ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {hideIgnored ? "Masquer ignorés" : "Afficher tous"}
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-muted/10">
            <CardContent className="space-y-3 p-8 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">Aucun contenu dans cette vue</p>
              <p className="text-xs text-muted-foreground">
                Termine un live depuis <Link to="/live-setup" className="text-primary underline-offset-2 hover:underline">Live Setup</Link>
                {" "}et envoie les idées du brief dans la queue.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <ContentRow key={item.id} item={item}
                youtubeConnected={youtubeConnected}
                onUpload={() => setUploadItem(item)}
                onUpdate={(patch) => updateItem(item.id, patch).catch(e => toast.error(e.message))}
                onDelete={() => {
                  if (confirm("Supprimer ce contenu ?")) {
                    deleteItem(item.id).then(() => toast.success("Supprimé")).catch(e => toast.error(e.message));
                  }
                }}
              />
            ))}
          </div>
        )}

        {uploadItem && (
          <YouTubeUploadDialog
            item={uploadItem}
            open={!!uploadItem}
            onOpenChange={(o) => { if (!o) setUploadItem(null); }}
            youtubeConnected={youtubeConnected}
            onReconnect={goReconnectYouTube}
            onUploaded={() => { refetch(); }}
          />
        )}
      </PageContainer>
    </AppShell>
  );
};

// ── Sub components ──────────────────────────────────────────────────────────

function StatCell({ label, value, accent }: { label: string; value: number; accent?: "amber" | "primary" | "emerald" }) {
  const cls =
    accent === "amber" ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
    : accent === "primary" ? "border-primary/30 bg-primary/5 text-primary"
    : accent === "emerald" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
    : "border-border/60 bg-card text-foreground";
  return (
    <div className={cn("rounded-md border p-3", cls)}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ContentRow({
  item, onUpdate, onDelete, youtubeConnected, onUpload,
}: {
  item: ContentItem;
  onUpdate: (patch: Partial<ContentItem>) => void;
  onDelete: () => void;
  youtubeConnected: boolean;
  onUpload: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [hashtagsRaw, setHashtagsRaw] = useState(item.hashtags.join(" "));
  const [notes, setNotes] = useState(item.notes ?? "");

  const platform = PLATFORM_META[item.platform];
  const PlatformIcon = platform.Icon;
  const status = STATUS_META[item.status];
  const priority = PRIORITY_META[item.priority];

  function handleSave() {
    const hashtags = hashtagsRaw.split(/[\s,]+/).map(t => t.trim().replace(/^#/, "")).filter(Boolean);
    onUpdate({
      title: title.trim() || item.title,
      description: description.trim() || null,
      hashtags,
      notes: notes.trim() || null,
    });
    setEditing(false);
    toast.success("Mis à jour");
  }

  return (
    <Card className={cn(
      "border-border/60 transition",
      item.status === "published" && "border-emerald-500/30 bg-emerald-500/5",
      item.status === "ignored" && "opacity-60",
    )}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/40">
            <PlatformIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-medium" maxLength={140} />
            ) : (
              <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">{platform.label}</Badge>
              <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium", status.cls)}>
                {status.label}
              </span>
              <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium", priority.cls)}>
                Priorité {priority.label}
              </span>
              {item.format && <span className="text-[10px] text-muted-foreground">· {item.format}</span>}
              {item.duration && <span className="text-[10px] text-muted-foreground">· {item.duration}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => copy(buildCopyPayload(item))} title="Copier titre + description + hashtags">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(v => !v)} title={editing ? "Annuler" : "Modifier"}>
              {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete} title="Supprimer">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hashtags (séparés par espace)</Label>
              <Input value={hashtagsRaw} onChange={(e) => setHashtagsRaw(e.target.value)} placeholder="#gaming #valorant" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes perso</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSave}><Save className="mr-1.5 h-3.5 w-3.5" />Enregistrer</Button>
            </div>
          </div>
        ) : (
          <>
            {item.description && (
              <p className="whitespace-pre-line text-xs text-muted-foreground">{item.description}</p>
            )}
            {item.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.hashtags.map(h => (
                  <span key={h} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    #{h}
                  </span>
                ))}
              </div>
            )}
            {item.reason && (
              <p className="rounded-md border border-border/60 bg-background/40 p-2 text-[11px] italic text-muted-foreground">
                <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
                {item.reason}
              </p>
            )}
            {item.notes && (
              <p className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2 text-[11px] text-muted-foreground">
                Notes : {item.notes}
              </p>
            )}
          </>
        )}

        {/* Actions row */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Statut</Label>
            <Select value={item.status} onValueChange={(v) => onUpdate({
              status: v as ContentStatus,
              published_at: v === "published" ? new Date().toISOString() : null,
            })}>
              <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Priorité</Label>
            <Select value={item.priority} onValueChange={(v) => onUpdate({ priority: v as ContentPriority })}>
              <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            {item.youtube_url && (
              <a href={item.youtube_url} target="_blank" rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-primary hover:underline">
                Voir sur YouTube <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {item.published_at && (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Publié le {new Date(item.published_at).toLocaleDateString("fr-FR")}
              </span>
            )}
            {item.live_session_id && (
              <Link to="/live-setup" className="inline-flex items-center gap-1 text-primary hover:underline">
                Live source <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            {item.platform === "youtube_shorts" && item.status !== "ignored" && (
              <Button
                size="sm"
                variant={youtubeConnected ? "default" : "outline"}
                className="h-7 px-2 text-[11px]"
                onClick={onUpload}
                title={youtubeConnected ? "Uploader sur YouTube" : "Connecte YouTube pour uploader"}
              >
                <Upload className="mr-1 h-3 w-3" />
                {item.youtube_video_id ? "Réuploader" : "Uploader sur YouTube"}
              </Button>
            )}
            {item.status !== "published" && item.status !== "ignored" && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
                onClick={() => onUpdate({ status: "published", published_at: new Date().toISOString() })}>
                <Circle className="mr-1 h-3 w-3" />
                Marquer publié
              </Button>
            )}
            {item.status !== "ignored" && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-muted-foreground"
                onClick={() => onUpdate({ status: "ignored" })}>
                Ignorer
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentQueuePage;
