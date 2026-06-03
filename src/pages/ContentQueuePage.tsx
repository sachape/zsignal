import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Inbox, Filter, Copy, Trash2, CheckCircle2, Circle, Eye, EyeOff,
  Loader2, Sparkles, Pencil, Save, X, ExternalLink, Tv, Video, Music2, Camera, Clapperboard, Upload,
  Film, Wand2, Clock, Flame, TrendingUp, BarChart3,
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
import ClipGenerationDialog from "@/components/content-queue/ClipGenerationDialog";
import { useVideoJobsForItem, type VideoJobStatus } from "@/hooks/useVideoJobs";

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
  const [generateItem, setGenerateItem] = useState<ContentItem | null>(null);

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
    }).sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0));
  }, [items, filter, hideIgnored]);

  const topPriority = useMemo(() => {
    return [...items]
      .filter(i => i.status !== "ignored" && i.status !== "published" && i.status !== "published_manually")
      .sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0))
      .slice(0, 3);
  }, [items]);

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

        {/* Top priority cockpit */}
        {topPriority.length > 0 && (
          <Card className="mb-5 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Flame className="h-4 w-4 text-primary" />
                À traiter en priorité
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                  Score éditorial — pas une prédiction de performance
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {topPriority.map(i => {
                  const meta = PLATFORM_META[i.platform];
                  const Ico = meta.Icon;
                  return (
                    <div key={i.id} className="rounded-md border border-border/60 bg-background/60 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Ico className="h-3 w-3 text-primary" />
                        {meta.label}
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                          <TrendingUp className="h-2.5 w-2.5" />
                          {i.opportunity_score ?? "—"}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs font-medium text-foreground">{i.title}</p>
                      {i.opportunity_label && (
                        <p className="mt-1 text-[10px] text-primary/80">{i.opportunity_label}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

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
                onEditSource={() => setSourceItem(item)}
                onGenerate={() => {
                  if (item.source_start_time == null || item.source_end_time == null) {
                    toast.error("Ajoute d'abord des timestamps valides (5–180 s).");
                    setSourceItem(item);
                    return;
                  }
                  setGenerateItem(item);
                }}
                onJobUpdate={() => refetch()}
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

        {sourceItem && (
          <SourceVideoDialog
            item={sourceItem}
            open={!!sourceItem}
            onOpenChange={(o) => { if (!o) setSourceItem(null); }}
            onSave={async (patch) => {
              try {
                await updateItem(sourceItem.id, patch);
                toast.success("Source vidéo enregistrée");
                setSourceItem(null);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erreur");
              }
            }}
          />
        )}

        {generateItem && (
          <ClipGenerationDialog
            item={generateItem}
            open={!!generateItem}
            onOpenChange={(o) => { if (!o) setGenerateItem(null); }}
            onLaunched={() => { refetch(); }}
          />
        )}
      </PageContainer>
    </AppShell>
  );
};

// ── Sub components ──────────────────────────────────────────────────────────

function StatCell({ label, value, accent }: { label: string; value: number; accent?: "amber" | "primary" | "emerald" | "violet" | "cyan" }) {
  const cls =
    accent === "amber" ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
    : accent === "primary" ? "border-primary/30 bg-primary/5 text-primary"
    : accent === "emerald" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
    : accent === "violet" ? "border-violet-500/30 bg-violet-500/5 text-violet-300"
    : accent === "cyan" ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-300"
    : "border-border/60 bg-card text-foreground";
  return (
    <div className={cn("rounded-md border p-3", cls)}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ContentRow({
  item, onUpdate, onDelete, youtubeConnected, onUpload, onEditSource, onGenerate, onJobUpdate,
}: {
  item: ContentItem;
  onUpdate: (patch: Partial<ContentItem>) => void;
  onDelete: () => void;
  youtubeConnected: boolean;
  onUpload: () => void;
  onEditSource: () => void;
  onGenerate: () => void;
  onJobUpdate: () => void;
}) {
  const isVideo = VIDEO_PLATFORMS.includes(item.platform);
  const hasGeneratedClip = !!item.generated_video_url;
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
              {typeof item.opportunity_score === "number" && (
                <span
                  title={item.opportunity_reason ?? undefined}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                >
                  <TrendingUp className="h-2.5 w-2.5" />
                  {item.opportunity_score}
                  {item.opportunity_label && <span className="font-normal opacity-80">· {item.opportunity_label}</span>}
                </span>
              )}
              {item.format && <span className="text-[10px] text-muted-foreground">· {item.format}</span>}
              {item.duration && <span className="text-[10px] text-muted-foreground">· {item.duration}</span>}
            </div>
            {/* Title variant picker */}
            {item.title_variants && item.title_variants.length > 1 && !editing && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Variantes :</span>
                {item.title_variants.map(v => {
                  const active = v.value === item.title;
                  return (
                    <button
                      key={v.style}
                      type="button"
                      onClick={() => onUpdate({ title: v.value, selected_title_variant: v.style })}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] transition",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-border/80",
                      )}
                      title={v.value}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            )}
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

        {/* V3D — Clip draft block (video platforms only) */}
        {isVideo && item.status !== "ignored" && (
          <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
              <Film className="h-3.5 w-3.5 text-primary" />
              Clip Draft
            </div>

            {hasGeneratedClip ? (
              <div className="space-y-2">
                <video
                  src={item.generated_video_url ?? undefined}
                  poster={item.thumbnail_url ?? undefined}
                  controls
                  className="w-full max-w-sm rounded-md border border-border/60 bg-black"
                />
                {item.status !== "ready" && (
                  <Button size="sm" variant="outline" className="h-7 text-[11px]"
                    onClick={() => onUpdate({ status: "ready" })}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Marquer comme prêt
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
                <div>
                  <span className="font-medium text-foreground">Source : </span>
                  {item.source_video_url
                    ? <a href={item.source_video_url} target="_blank" rel="noreferrer noopener"
                        className="text-primary hover:underline break-all">
                        {item.source_platform ?? "vidéo"} <ExternalLink className="inline h-3 w-3" />
                      </a>
                    : <span className="italic">Aucune source enregistrée (l'upload se fait à la génération)</span>}
                </div>
                <div>
                  <span className="font-medium text-foreground">Moment : </span>
                  {item.source_start_time != null && item.source_end_time != null
                    ? <>de {formatSeconds(item.source_start_time)} à {formatSeconds(item.source_end_time)} <span className="text-muted-foreground/70">· {item.source_end_time - item.source_start_time}s</span></>
                    : <span className="italic">Aucun timestamp</span>}
                </div>
              </div>
            )}

            <ClipJobStatus contentItemId={item.id} onTerminal={onJobUpdate} />

            {item.generation_error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
                {item.generation_error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onEditSource}>
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                {item.source_start_time != null ? "Modifier les timestamps" : "Définir les timestamps"}
              </Button>
              {!hasGeneratedClip && (
                <Button
                  size="sm" className="h-7 text-[11px]"
                  onClick={onGenerate}
                  disabled={item.source_start_time == null || item.source_end_time == null || item.generation_status === "queued" || item.generation_status === "processing"}
                  title="Lancer la génération du clip"
                >
                  {item.generation_status === "queued" || item.generation_status === "processing"
                    ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
                  {item.generation_status === "failed" ? "Réessayer" : "Générer le clip"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* V3.7 — Après publication (analytics YouTube réels) */}
        {(item.published_url || item.published_at || item.youtube_video_id || item.youtube_url) && (
          <AfterPublishPanel item={item} onSynced={onJobUpdate} />
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
                title={
                  !youtubeConnected ? "Connecte YouTube pour uploader"
                    : hasGeneratedClip ? "Uploader le clip généré sur YouTube"
                    : "Uploader un fichier sur YouTube"
                }
              >
                <Upload className="mr-1 h-3 w-3" />
                {item.youtube_video_id
                  ? "Réuploader"
                  : hasGeneratedClip
                    ? "Uploader le clip"
                    : "Uploader sur YouTube"}
              </Button>
            )}
            {item.status !== "published" && item.status !== "published_manually" && item.status !== "ignored" && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
                onClick={() => onUpdate({ status: "published_manually", published_at: new Date().toISOString() })}>
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
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function parseTimeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Supports mm:ss, hh:mm:ss, or plain seconds.
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const parts = trimmed.split(":").map(p => parseInt(p, 10));
  if (parts.some(p => Number.isNaN(p) || p < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function detectSourcePlatform(url: string): "twitch" | "youtube" | "manual" {
  const u = url.toLowerCase();
  if (u.includes("twitch.tv")) return "twitch";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  return "manual";
}

// ── SourceVideoDialog ────────────────────────────────────────────────────────

function SourceVideoDialog({
  item, open, onOpenChange, onSave,
}: {
  item: ContentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: Partial<ContentItem>) => Promise<void> | void;
}) {
  const [url, setUrl] = useState(item.source_video_url ?? "");
  const [start, setStart] = useState(
    item.source_start_time != null ? formatSeconds(item.source_start_time) : "",
  );
  const [end, setEnd] = useState(
    item.source_end_time != null ? formatSeconds(item.source_end_time) : "",
  );
  const [saving, setSaving] = useState(false);

  const startSec = parseTimeInput(start);
  const endSec = parseTimeInput(end);
  const duration = startSec != null && endSec != null ? endSec - startSec : null;

  const urlOk = (() => {
    if (!url.trim()) return false;
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch { return false; }
  })();

  const durationOk = duration != null && duration >= 5 && duration <= 180;
  const canSave = urlOk && startSec != null && endSec != null && endSec > startSec && durationOk;

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        source_video_url: url.trim(),
        source_platform: detectSourcePlatform(url),
        source_start_time: startSec,
        source_end_time: endSec,
        source_duration: duration,
        // Keep status coherent: if it was just an idea, move to to_generate.
        ...(item.status === "idea" ? { status: "to_generate" as const } : {}),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" /> Source vidéo
          </DialogTitle>
          <DialogDescription>
            Colle l'URL de la VOD Twitch / YouTube source, puis indique le moment à clipper.
            Durée recommandée : 15 à 60 secondes (max 180).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">URL de la VOD ou de la vidéo</Label>
            <Input
              value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.twitch.tv/videos/… ou https://youtu.be/…"
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Début (mm:ss)</Label>
              <Input value={start} onChange={(e) => setStart(e.target.value)} placeholder="12:34" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fin (mm:ss)</Label>
              <Input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="13:10" />
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-muted/20 p-2 text-[11px] text-muted-foreground">
            {duration == null
              ? "Indique des timestamps valides."
              : duration <= 0
                ? "La fin doit être après le début."
                : duration < 5
                  ? `Trop court (${duration}s). Minimum recommandé : 15s.`
                  : duration > 180
                    ? `Trop long (${duration}s). Maximum : 180s.`
                    : `Durée : ${duration}s ${duration < 15 || duration > 60 ? "(hors plage recommandée 15-60s)" : "✓"}`}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSave || saving}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Enregistrer la source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ClipJobStatus ────────────────────────────────────────────────────────────
// Polls the latest video generation job for an item and renders its live state.

const JOB_STATUS_META: Record<VideoJobStatus, { label: string; cls: string }> = {
  queued:     { label: "En file d'attente",  cls: "border-violet-500/40 bg-violet-500/10 text-violet-200" },
  processing: { label: "Découpe en cours",   cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200" },
  completed:  { label: "Clip prêt",          cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" },
  failed:     { label: "Échec",              cls: "border-destructive/40 bg-destructive/10 text-destructive" },
  cancelled:  { label: "Annulé",             cls: "border-border/40 bg-muted/30 text-muted-foreground" },
};

function ClipJobStatus({ contentItemId, onTerminal }: { contentItemId: string; onTerminal: () => void }) {
  const { job } = useVideoJobsForItem(contentItemId);
  const prevStatus = useRef<VideoJobStatus | null>(null);

  useEffect(() => {
    if (!job) return;
    const wasActive = prevStatus.current === "queued" || prevStatus.current === "processing";
    const isTerminal = job.status === "completed" || job.status === "failed";
    if (wasActive && isTerminal) onTerminal();
    prevStatus.current = job.status;
  }, [job, onTerminal]);

  if (!job) return null;
  if (job.status === "completed") return null; // success already reflected via item.generated_video_url

  const meta = JOB_STATUS_META[job.status];
  return (
    <div className={cn("space-y-1.5 rounded-md border p-2.5 text-[11px]", meta.cls)}>
      <div className="flex items-center justify-between">
        <span className="font-semibold">{meta.label}</span>
        {typeof job.progress === "number" && job.status === "processing" && (
          <span className="tabular-nums">{job.progress}%</span>
        )}
      </div>
      {job.status === "processing" && typeof job.progress === "number" && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-background/40">
          <div className="h-full bg-current opacity-70 transition-all" style={{ width: `${job.progress}%` }} />
        </div>
      )}
      {job.status === "queued" && (
        <p className="opacity-80">Streamnco découpe ton extrait dès qu'un worker est disponible.</p>
      )}
      {job.status === "failed" && job.error_message && (
        <p className="opacity-90">{job.error_message}</p>
      )}
    </div>
  );
}

export default ContentQueuePage;
