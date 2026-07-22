import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Camera,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Info,
  Loader2,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { format as formatDate } from "date-fns";
import { fr } from "date-fns/locale";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { SelectableCard } from "@/components/ui/selectable-card";
import { useSocialPosts, type SocialFormat, type SocialPost } from "@/hooks/useSocialPosts";
import { useConnectedNetworks } from "@/hooks/useConnectedNetworks";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import InstagramPreview from "@/components/composer/InstagramPreview";

const FORMATS: Array<{ id: SocialFormat; label: string; icon: typeof Camera; hint: string }> = [
  { id: "post", label: "Post", icon: ImageIcon, hint: "Format carré 1:1 — feed Instagram" },
  { id: "reel", label: "Reel", icon: Film, hint: "Vidéo verticale 9:16 — onglet Reels" },
  { id: "story", label: "Story", icon: Clapperboard, hint: "9:16 éphémère — 24h" },
];

const parseHashtags = (input: string): string[] =>
  input
    .split(/[\s,]+/)
    .map((t) => t.trim().replace(/^#+/, ""))
    .filter(Boolean);

const ComposerPage = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get("id");
  const initialFormat = (params.get("format") as SocialFormat) || "post";

  const { posts, createDraft, updatePost, uploadMedia, removePost } = useSocialPosts();
  const { accounts } = useConnectedNetworks();
  const { connection: metaConnection } = useInstagramConnection();
  const instagramAccount = useMemo(
    () => accounts.find((a) => a.platform === "instagram"),
    [accounts],
  );
  const isInstagramConnected = metaConnection?.connection_status === "connected";

  const [draftId, setDraftId] = useState<string | null>(editId);
  const [pickedFormat, setPickedFormat] = useState<SocialFormat>(initialFormat);
  const [caption, setCaption] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaMime, setMediaMime] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate from existing draft when editing
  useEffect(() => {
    if (!editId) return;
    const existing = posts.find((p) => p.id === editId);
    if (!existing) return;
    setDraftId(existing.id);
    setPickedFormat(existing.format);
    setCaption(existing.caption ?? "");
    setHashtagsInput(existing.hashtags.join(" "));
    setMediaUrl(existing.media_url);
    setMediaMime(existing.media_mime_type);
    setScheduledAt(existing.scheduled_at ? new Date(existing.scheduled_at) : undefined);
  }, [editId, posts]);

  // Pre-fill from query params (Content Queue handoff)
  useEffect(() => {
    if (editId) return;
    const c = params.get("caption");
    const h = params.get("hashtags");
    const m = params.get("media");
    const mime = params.get("mime");
    if (c) setCaption(c);
    if (h) setHashtagsInput(h);
    if (m) {
      setMediaUrl(m);
      setMediaMime(mime ?? (m.match(/\.(mp4|mov|webm)/i) ? "video/mp4" : "image/jpeg"));
    }
  }, [editId, params]);

  const hashtags = parseHashtags(hashtagsInput);

  const ensureDraftId = async (): Promise<string> => {
    if (draftId) return draftId;
    const created = await createDraft({
      format: pickedFormat,
      platform: "instagram",
      caption,
      hashtags,
    });
    setDraftId(created.id);
    setParams({ id: created.id }, { replace: true });
    return created.id;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const id = await ensureDraftId();
      const { path, url } = await uploadMedia(id, file);
      await updatePost(id, {
        media_storage_path: path,
        media_url: url,
        media_mime_type: file.type,
      });
      setMediaUrl(url);
      setMediaMime(file.type);
      toast.success("Média ajouté au brouillon");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const persist = async (patch: Partial<SocialPost> = {}) => {
    setSaving(true);
    try {
      const id = await ensureDraftId();
      await updatePost(id, {
        format: pickedFormat,
        caption,
        hashtags,
        ...patch,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await persist({ status: "draft" });
      toast.success("Ton contenu est sauvegardé en brouillon.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de sauvegarde");
    }
  };

  const handleSchedule = async () => {
    if (!scheduledAt) {
      toast.error("Choisis une date de planification");
      return;
    }
    try {
      await persist({ status: "scheduled", scheduled_at: scheduledAt.toISOString() });
      toast.message("Planification enregistrée", {
        description:
          "Ta publication est préparée et datée. L'envoi automatique sera disponible quand la connexion Meta et le scheduler seront activés.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleDelete = async () => {
    if (!draftId) {
      navigate("/publications");
      return;
    }
    if (!confirm("Supprimer ce brouillon ? Cette action est définitive.")) return;
    try {
      await removePost(draftId);
      toast.success("Brouillon supprimé");
      navigate("/publications");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  // Compute the most truthful publish-state message
  const publishState = (() => {
    if (!isInstagramConnected) {
      return {
        title: "Instagram non connecté",
        body: "Connecte Instagram pour publier depuis Streamnco. En attendant, tes brouillons et plannings restent enregistrés.",
        tone: "muted" as const,
      };
    }
    if (!FEATURE_FLAGS.INSTAGRAM_PUBLISH_ENABLED) {
      return {
        title: "Publication Instagram en attente de validation Meta",
        body: "Ton compte est connecté. L'envoi automatique sera activé une fois la validation Meta et le scheduler en place.",
        tone: "warning" as const,
      };
    }
    return null;
  })();

  const PublishLockedNotice = publishState && (
    <div
      className={cn(
        "rounded-lg border p-3 text-xs",
        publishState.tone === "warning"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
          : "border-border bg-card/50 text-muted-foreground",
      )}
    >
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold mb-0.5">{publishState.title}</div>
          <div className={publishState.tone === "warning" ? "text-amber-200/80" : ""}>
            {publishState.body}
            {!isInstagramConnected && (
              <>
                {" "}
                <Link to="/reseaux/instagram" className="text-primary-strong underline">
                  Aller dans Réseaux
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const InstagramNotConnected = null;

  return (
    <AppShell>
      <PageContainer size="lg">
        <PageHeader
          eyebrow="File de contenu"
          title="Composer"
          description="Prépare, prévisualise et planifie tes publications Instagram."
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/publications")}>
                Voir les publications
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mt-6">
          {/* LEFT: form */}
          <div className="space-y-5">
            {InstagramNotConnected}
            {PublishLockedNotice}

            <Card>
              <CardContent className="p-5 space-y-5">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Réseau
                  </Label>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-sm">
                    <Camera className="h-4 w-4 text-primary-strong" />
                    Instagram
                    <Badge variant="outline" className="text-[12px]">V1</Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Format
                  </Label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {FORMATS.map((f) => {
                      const Icon = f.icon;
                      const active = pickedFormat === f.id;
                      return (
                        <SelectableCard
                          key={f.id}
                          selected={active}
                          onClick={() => setPickedFormat(f.id)}
                          className="flex flex-col items-start gap-1 p-3 text-left"
                        >
                          <Icon className={cn("h-4 w-4", active ? "text-primary-strong" : "text-muted-foreground")} />
                          <span className="text-sm font-medium">{f.label}</span>
                          <span className="text-[12px] text-muted-foreground leading-tight">{f.hint}</span>
                        </SelectableCard>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="media" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Média
                  </Label>
                  <div className="mt-2">
                    <label
                      htmlFor="media"
                      className={cn(
                        "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground hover:bg-muted/30",
                        uploading && "opacity-60 pointer-events-none",
                      )}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {mediaUrl ? "Remplacer le média" : "Ajouter une image ou une vidéo"}
                    </label>
                    <input
                      id="media"
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {mediaUrl && (
                      <p className="mt-1.5 text-[12px] text-muted-foreground truncate">
                        Média prêt — {mediaMime}
                      </p>
                    )}
                  </div>
                </div>

                {pickedFormat !== "story" && (
                  <div>
                    <Label htmlFor="caption" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Caption
                    </Label>
                    <Textarea
                      id="caption"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Écris ta légende…"
                      rows={5}
                      className="mt-2 resize-none"
                    />
                    <div className="mt-1 text-[12px] text-muted-foreground text-right">
                      {caption.length} caractères
                    </div>
                  </div>
                )}

                {pickedFormat !== "story" && (
                  <div>
                    <Label htmlFor="hashtags" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Hashtags
                    </Label>
                    <Input
                      id="hashtags"
                      value={hashtagsInput}
                      onChange={(e) => setHashtagsInput(e.target.value)}
                      placeholder="#twitch #stream #fr"
                      className="mt-2"
                    />
                    {hashtags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {hashtags.map((t) => (
                          <Badge key={t} variant="outline" className="text-[12px]">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {pickedFormat === "story" && (
                  <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    <Sparkles className="inline h-3.5 w-3.5 mr-1 text-primary-strong" />
                    Les stories ne nécessitent pas de caption. Stickers et liens seront ajoutés plus tard.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleSaveDraft} variant="outline" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Sauvegarder en brouillon
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline">
                          <CalendarIcon className="h-4 w-4" />
                          {scheduledAt
                            ? formatDate(scheduledAt, "dd MMM yyyy HH:mm", { locale: fr })
                            : "Planifier"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3 pointer-events-auto" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledAt}
                          onSelect={(d) => {
                            if (!d) return;
                            const next = new Date(d);
                            if (scheduledAt) {
                              next.setHours(scheduledAt.getHours(), scheduledAt.getMinutes());
                            } else {
                              next.setHours(10, 0, 0, 0);
                            }
                            setScheduledAt(next);
                          }}
                          className="pointer-events-auto"
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            type="time"
                            value={
                              scheduledAt
                                ? `${String(scheduledAt.getHours()).padStart(2, "0")}:${String(scheduledAt.getMinutes()).padStart(2, "0")}`
                                : "10:00"
                            }
                            onChange={(e) => {
                              const [h, m] = e.target.value.split(":").map(Number);
                              const next = scheduledAt ? new Date(scheduledAt) : new Date();
                              next.setHours(h || 0, m || 0, 0, 0);
                              setScheduledAt(next);
                            }}
                          />
                          <Button size="sm" onClick={handleSchedule} disabled={!scheduledAt}>
                            Planifier
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      disabled
                      variant="outline"
                      title="Publication automatique bientôt disponible après validation des plateformes."
                      className="gap-1.5"
                    >
                      <Send className="h-4 w-4" />
                      Publier automatiquement
                      <span className="ml-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0 text-[12px] font-semibold text-amber-300">
                        Bientôt
                      </span>
                    </Button>
                  </div>
                  {draftId && (
                    <Button
                      variant="destructive-outline"
                      size="sm"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: preview */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Aperçu — Instagram {FORMATS.find((f) => f.id === pickedFormat)?.label}
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-b from-muted/20 to-transparent p-5">
              <InstagramPreview
                format={pickedFormat}
                caption={caption}
                hashtags={hashtags}
                mediaUrl={mediaUrl}
                mediaMime={mediaMime}
                username={instagramAccount?.username || instagramAccount?.display_name || "votre_compte"}
                avatarUrl={instagramAccount?.avatar_url}
              />
            </div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default ComposerPage;
