import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Rocket, Save, Sparkles, Tv, Video, Music2, Camera,
  CheckCircle2, Copy, Trash2, Clock, ChevronRight, ListChecks, Wand2,
  ExternalLink, AlertTriangle, Loader2,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useConnectedNetworks } from "@/hooks/useConnectedNetworks";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { useLiveSessions, type LiveSession } from "@/hooks/useLiveSessions";
import {
  generateMetadata, DEFAULT_CHECKLIST_ITEMS,
  type LiveSetupInput, type LiveTargetPlatform, type LiveTone, type GeneratedMetadata,
} from "@/services/liveSetupGenerator";

const TONES: { value: LiveTone; label: string }[] = [
  { value: "chill", label: "Chill" },
  { value: "competitive", label: "Compétitif" },
  { value: "educational", label: "Éducatif" },
  { value: "entertainment", label: "Divertissement" },
];

const PLATFORMS: { value: LiveTargetPlatform; label: string; Icon: React.FC<{ className?: string }>; soon?: boolean }[] = [
  { value: "twitch", label: "Twitch", Icon: Tv },
  { value: "youtube", label: "YouTube", Icon: Video },
  { value: "tiktok", label: "TikTok Live", Icon: Music2, soon: true },
  { value: "instagram", label: "Instagram Live", Icon: Camera, soon: true },
];

const EMPTY_INPUT: LiveSetupInput = {
  titleRaw: "",
  gameCategory: "",
  objective: "",
  tone: "",
  language: "fr",
  targetAudience: "",
  platforms: ["twitch"],
  scheduledAt: "",
};

const EMPTY_CHECKLIST = DEFAULT_CHECKLIST_ITEMS.reduce<Record<string, boolean>>(
  (acc, i) => ({ ...acc, [i.id]: false }), {},
);

function copy(value: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success("Copié"),
    () => toast.error("Copie impossible"),
  );
}

const LiveSetupPage = () => {
  const { accounts } = useConnectedNetworks();
  const { isConnected: twitchConnected } = useTwitchConnection();
  const { sessions, loading, saveSession, deleteSession, refetch } = useLiveSessions();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [input, setInput] = useState<LiveSetupInput>(EMPTY_INPUT);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(EMPTY_CHECKLIST);
  const [metadata, setMetadata] = useState<GeneratedMetadata>(() => generateMetadata(EMPTY_INPUT));
  const [saving, setSaving] = useState(false);
  const [pushingTwitch, setPushingTwitch] = useState(false);
  const [pushingYouTube, setPushingYouTube] = useState(false);
  const [ytPrivacy, setYtPrivacy] = useState<"private" | "unlisted" | "public">("private");

  const youtubeConnected = useMemo(
    () => accounts.some(a => a.platform === "youtube" && a.connection_status === "connected"),
    [accounts],
  );

  const editingSession = useMemo(
    () => sessions.find(s => s.id === editingId) ?? null,
    [sessions, editingId],
  );

  useEffect(() => {
    setMetadata(generateMetadata(input));
  }, [input]);

  const checklistProgress = useMemo(() => {
    const total = DEFAULT_CHECKLIST_ITEMS.length;
    const done = DEFAULT_CHECKLIST_ITEMS.filter(i => checklist[i.id]).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [checklist]);

  const resetForm = () => {
    setEditingId(null);
    setInput(EMPTY_INPUT);
    setChecklist(EMPTY_CHECKLIST);
  };

  const loadSession = (s: LiveSession) => {
    setEditingId(s.id);
    setInput({
      titleRaw: s.title_raw || "",
      gameCategory: s.game_category || "",
      objective: s.objective || "",
      tone: (s.tone as LiveTone) || "",
      language: s.language || "fr",
      targetAudience: s.target_audience || "",
      platforms: (s.platforms as LiveTargetPlatform[]) ?? ["twitch"],
      scheduledAt: s.scheduled_at || "",
    });
    setChecklist({ ...EMPTY_CHECKLIST, ...(s.checklist || {}) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async (status: "draft" | "ready") => {
    if (!input.titleRaw.trim() && !input.gameCategory.trim()) {
      toast.error("Renseigne au moins un titre ou une catégorie");
      return;
    }
    setSaving(true);
    try {
      await saveSession({
        id: editingId ?? undefined,
        input, metadata, checklist, status,
      });
      toast.success(status === "ready" ? "Session prête" : "Brouillon sauvegardé");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette session ?")) return;
    try {
      await deleteSession(id);
      if (editingId === id) resetForm();
      toast.success("Session supprimée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const togglePlatform = (p: LiveTargetPlatform) => {
    setInput(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p],
    }));
  };

  // Persist the current form as a session and return its ID — required by the
  // push edge functions (they need a live_session_id to record results).
  async function ensureSavedSession(): Promise<string | null> {
    if (editingId) return editingId;
    if (!input.titleRaw.trim() && !input.gameCategory.trim()) {
      toast.error("Renseigne au moins un titre ou une catégorie");
      return null;
    }
    setSaving(true);
    try {
      const created = await saveSession({ input, metadata, checklist, status: "ready" });
      if (created?.id) { setEditingId(created.id); return created.id; }
      return null;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de sauvegarde");
      return null;
    } finally { setSaving(false); }
  }

  function handlePushError(reason: string | undefined, platform: "twitch" | "youtube", category?: string) {
    switch (reason) {
      case "twitch_not_connected":
        toast.error("Twitch non connecté"); break;
      case "youtube_not_connected":
        toast.error("YouTube non connecté"); break;
      case "missing_scope":
        toast.error(platform === "twitch"
          ? "Reconnecte Twitch pour autoriser la mise à jour du titre et de la catégorie."
          : "Reconnecte YouTube avec l'autorisation de créer des lives.");
        break;
      case "token_expired":
      case "token_unavailable":
        toast.error(platform === "twitch" ? "Token Twitch expiré, reconnecte." : "Token YouTube expiré, reconnecte.");
        break;
      case "category_not_found":
        toast.error(category
          ? `Catégorie Twitch « ${category} » introuvable. Vérifie l'orthographe exacte.`
          : "Catégorie Twitch introuvable.");
        break;
      case "live_not_enabled":
        toast.error("Live YouTube non activé sur ce compte (vérification 24h requise)."); break;
      case "nothing_to_update":
        toast.error("Rien à pousser : ajoute un titre ou une catégorie."); break;
      case "missing_params":
      case "missing_session":
      case "invalid_body":
        toast.error("Requête invalide."); break;
      case "server_misconfigured":
        toast.error("Configuration serveur manquante."); break;
      case "twitch_error":
        toast.error("Twitch a rejeté la mise à jour."); break;
      case "youtube_error":
        toast.error("YouTube a rejeté la création du live."); break;
      default:
        toast.error(platform === "twitch" ? "Erreur Twitch" : "Erreur YouTube");
    }
  }

  // Extract { success, reason } from a supabase.functions.invoke result —
  // when the edge function returns non-2xx, supabase-js sets `data: null`
  // and stores the body on `error.context`. Read it so we never silently
  // claim success and always surface the real reason.
  async function readInvokeOutcome(
    data: unknown, error: unknown,
  ): Promise<{ success: boolean; reason?: string }> {
    if (data && typeof data === "object") {
      const d = data as { success?: boolean; reason?: string };
      if (typeof d.success === "boolean") return { success: d.success, reason: d.reason };
    }
    if (error) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await (error as any).context?.json?.();
        if (body && typeof body === "object") {
          return { success: !!body.success, reason: body.reason as string | undefined };
        }
      } catch { /* ignore */ }
      return { success: false, reason: undefined };
    }
    return { success: false, reason: undefined };
  }

  async function handlePushTwitch() {
    if (!twitchConnected) { toast.error("Twitch non connecté"); return; }
    const title = metadata.twitch.title.trim();
    const category = metadata.twitch.category.trim();
    if (!title && !category) { toast.error("Renseigne au moins un titre ou une catégorie"); return; }
    const sessionId = await ensureSavedSession();
    if (!sessionId) return;
    setPushingTwitch(true);
    try {
      const { data, error } = await supabase.functions.invoke("twitch-update-channel", {
        body: {
          live_session_id: sessionId,
          title,
          category,
          language: input.language || undefined,
        },
      });
      const outcome = await readInvokeOutcome(data, error);
      if (!outcome.success) { handlePushError(outcome.reason, "twitch", category); return; }
      toast.success("Twitch mis à jour");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur Twitch");
    } finally { setPushingTwitch(false); }
  }

  async function handlePushYouTube() {
    if (!youtubeConnected) { toast.error("YouTube non connecté"); return; }
    const title = metadata.youtube.title.trim();
    if (!title) { toast.error("Renseigne un titre pour créer le live YouTube"); return; }
    // YouTube rejects scheduled times in the past — validate before invoking.
    if (input.scheduledAt) {
      const t = Date.parse(input.scheduledAt);
      if (!Number.isFinite(t) || t < Date.now() - 60_000) {
        toast.error("La date programmée doit être dans le futur.");
        return;
      }
    }
    const sessionId = await ensureSavedSession();
    if (!sessionId) return;
    setPushingYouTube(true);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-create-live-broadcast", {
        body: {
          live_session_id: sessionId,
          title,
          description: metadata.youtube.description,
          scheduled_start_time: input.scheduledAt || undefined,
          privacy_status: ytPrivacy,
          language: input.language || undefined,
        },
      });
      const outcome = await readInvokeOutcome(data, error);
      if (!outcome.success) { handlePushError(outcome.reason, "youtube"); return; }
      toast.success(
        ytPrivacy === "private" ? "Live YouTube créé (privé)"
        : ytPrivacy === "unlisted" ? "Live YouTube créé (non listé)"
        : "Live YouTube créé (public)",
      );
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur YouTube");
    } finally { setPushingYouTube(false); }
  }

  return (
    <AppShell>
      <PageContainer size="lg">
        <PageHeader
          eyebrow="Cockpit pré-live"
          title="Live Setup"
          description="Prépare ton live une seule fois, adapte-le à chaque plateforme et évite les titres copiés-collés partout."
          action={
            editingId ? (
              <Button variant="outline" size="sm" onClick={resetForm}>
                Nouvelle session
              </Button>
            ) : null
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* ── LEFT: Form + checklist ─────────────────────────────────────── */}
          <div className="space-y-6">
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Wand2 className="h-4 w-4 text-primary" />
                  Idée du live
                </div>

                <div className="space-y-2">
                  <Label htmlFor="titleRaw">Titre brut / idée du live</Label>
                  <Input
                    id="titleRaw"
                    value={input.titleRaw}
                    onChange={(e) => setInput({ ...input, titleRaw: e.target.value })}
                    placeholder="Ex : Ranked tryhard jusqu'à Diamant"
                    maxLength={140}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="game">Jeu ou catégorie</Label>
                    <Input
                      id="game"
                      value={input.gameCategory}
                      onChange={(e) => setInput({ ...input, gameCategory: e.target.value })}
                      placeholder="Ex : Valorant"
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="objective">Objectif du live</Label>
                    <Input
                      id="objective"
                      value={input.objective}
                      onChange={(e) => setInput({ ...input, objective: e.target.value })}
                      placeholder="Ex : monter Diamant 2"
                      maxLength={120}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tone">Ton souhaité</Label>
                    <Select
                      value={input.tone || undefined}
                      onValueChange={(v) => setInput({ ...input, tone: v as LiveTone })}
                    >
                      <SelectTrigger id="tone"><SelectValue placeholder="Choisir un ton" /></SelectTrigger>
                      <SelectContent>
                        {TONES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lang">Langue</Label>
                    <Select
                      value={input.language}
                      onValueChange={(v) => setInput({ ...input, language: v })}
                    >
                      <SelectTrigger id="lang"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="audience">Audience cible</Label>
                    <Input
                      id="audience"
                      value={input.targetAudience}
                      onChange={(e) => setInput({ ...input, targetAudience: e.target.value })}
                      placeholder="Ex : joueurs FR niveau intermédiaire"
                      maxLength={160}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="scheduled">Date / heure (optionnel)</Label>
                    <Input
                      id="scheduled"
                      type="datetime-local"
                      value={input.scheduledAt ? input.scheduledAt.slice(0, 16) : ""}
                      onChange={(e) => setInput({
                        ...input,
                        scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Plateformes ciblées</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(({ value, label, Icon, soon }) => {
                      const active = input.platforms.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => !soon && togglePlatform(value)}
                          disabled={soon}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card hover:border-border/80",
                            soon && "cursor-not-allowed opacity-60",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                          {soon && <Badge variant="outline" className="ml-1 text-[10px]">bientôt</Badge>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => handleSave("ready")} disabled={saving}>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Marquer comme prêt
                  </Button>
                  <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
                    <Save className="mr-1.5 h-4 w-4" />
                    Sauvegarder le brouillon
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card className="border-border/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ListChecks className="h-4 w-4 text-primary" />
                    Checklist avant live
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {checklistProgress.done}/{checklistProgress.total}
                  </Badge>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${checklistProgress.pct}%` }}
                  />
                </div>
                <ul className="space-y-2">
                  {DEFAULT_CHECKLIST_ITEMS.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`chk-${item.id}`}
                        checked={!!checklist[item.id]}
                        onCheckedChange={(v) =>
                          setChecklist((prev) => ({ ...prev, [item.id]: v === true }))
                        }
                      />
                      <Label
                        htmlFor={`chk-${item.id}`}
                        className={cn(
                          "cursor-pointer text-sm",
                          checklist[item.id] ? "text-muted-foreground line-through" : "text-foreground",
                        )}
                      >
                        {item.label}
                      </Label>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT: Preview + actions + saved sessions ─────────────────── */}
          <div className="space-y-6">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Métadonnées générées
                </div>

                <Tabs defaultValue="twitch">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="twitch">Twitch</TabsTrigger>
                    <TabsTrigger value="youtube">YouTube</TabsTrigger>
                    <TabsTrigger value="kick">Kick</TabsTrigger>
                    <TabsTrigger value="social">Social</TabsTrigger>
                  </TabsList>

                  <TabsContent value="twitch" className="space-y-3 pt-4">
                    <PreviewField label="Titre Twitch" value={metadata.twitch.title} />
                    <PreviewField label="Catégorie" value={metadata.twitch.category || "—"} />
                    <PushActionRow
                      icon={<Tv className="h-4 w-4" />}
                      connected={twitchConnected}
                      busy={pushingTwitch || saving}
                      labelConnected="Mettre à jour Twitch"
                      labelMissing="Connecte Twitch"
                      onPush={handlePushTwitch}
                    />
                    <PushHistory entry={(editingSession?.generated_metadata as Record<string, PushEntry> | undefined)?.twitch_push} platform="twitch" />
                  </TabsContent>

                  <TabsContent value="youtube" className="space-y-3 pt-4">
                    <PreviewField label="Titre YouTube" value={metadata.youtube.title} />
                    <PreviewField label="Description" value={metadata.youtube.description} multiline />
                    <PreviewField
                      label="Tags"
                      value={metadata.youtube.tags.join(", ") || "—"}
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Confidentialité</Label>
                      <Select value={ytPrivacy} onValueChange={(v) => setYtPrivacy(v as typeof ytPrivacy)}>
                        <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Privé</SelectItem>
                          <SelectItem value="unlisted">Non listé</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <PushActionRow
                      icon={<Video className="h-4 w-4" />}
                      connected={youtubeConnected}
                      busy={pushingYouTube || saving}
                      labelConnected="Créer un live YouTube"
                      labelMissing="Connecte YouTube"
                      onPush={handlePushYouTube}
                    />
                    <PushHistory entry={(editingSession?.generated_metadata as Record<string, PushEntry> | undefined)?.youtube_push} platform="youtube" />
                  </TabsContent>


                  <TabsContent value="kick" className="space-y-3 pt-4">
                    <PreviewField label="Titre Kick" value={metadata.kick.title} />
                    <p className="text-xs text-muted-foreground">
                      L'intégration Kick arrivera plus tard. Tu peux copier le titre pour le coller manuellement.
                    </p>
                  </TabsContent>

                  <TabsContent value="social" className="space-y-3 pt-4">
                    <PreviewField label="Post court" value={metadata.socialSummary} multiline />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Saved sessions */}
            <Card className="border-border/60">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Sessions sauvegardées
                  </div>
                  <Badge variant="outline" className="text-xs">{sessions.length}</Badge>
                </div>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune session pour l'instant. Remplis le formulaire et sauvegarde un brouillon.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {sessions.map((s) => (
                      <li
                        key={s.id}
                        className={cn(
                          "group flex items-center gap-3 rounded-md border p-3 transition",
                          editingId === s.id
                            ? "border-primary bg-primary/5"
                            : "border-border/60 hover:border-border",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => loadSession(s)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-medium text-foreground">
                            {s.title_raw || s.game_category || "Sans titre"}
                          </p>
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <StatusPill status={s.status} />
                            {s.game_category && <span className="truncate">· {s.game_category}</span>}
                          </p>
                        </button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(s.id)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed border-border/60 bg-muted/20">
              <CardContent className="p-4 text-xs text-muted-foreground">
                <Rocket className="mb-1.5 inline h-3.5 w-3.5 text-primary" />{" "}
                Le vrai bouton « Lancer le live partout » arrivera plus tard. Pour cette V1 : prépare,
                copie/colle, et configure tes plateformes connectées depuis{" "}
                <Link to="/reseaux" className="text-primary underline-offset-2 hover:underline">
                  Réseaux
                </Link>.
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
};

// ── Sub components ──────────────────────────────────────────────────────────
function PreviewField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
        <Button
          variant="ghost" size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => copy(value)}
        >
          <Copy className="mr-1 h-3 w-3" /> Copier
        </Button>
      </div>
      {multiline ? (
        <Textarea value={value} readOnly rows={6} className="resize-none font-mono text-xs" />
      ) : (
        <Input value={value} readOnly className="font-mono text-xs" />
      )}
    </div>
  );
}

interface PushEntry {
  pushed_at?: string;
  created_at?: string;
  status?: string;
  title?: string;
  game_name?: string;
  youtube_broadcast_id?: string;
  youtube_watch_url?: string;
  privacy_status?: string;
}

function PushActionRow({
  icon, connected, busy, labelConnected, labelMissing, onPush,
}: {
  icon: React.ReactNode; connected: boolean; busy: boolean;
  labelConnected: string; labelMissing: string; onPush: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{connected ? labelConnected : labelMissing}</span>
      </div>
      {connected ? (
        <Button size="sm" onClick={onPush} disabled={busy}>
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
          {busy ? "Envoi…" : "Envoyer"}
        </Button>
      ) : (
        <Button size="sm" variant="outline" asChild>
          <Link to="/reseaux">Connecter</Link>
        </Button>
      )}
    </div>
  );
}

function PushHistory({ entry, platform }: { entry?: PushEntry; platform: "twitch" | "youtube" }) {
  if (!entry) return null;
  const ts = entry.pushed_at ?? entry.created_at;
  const date = ts ? new Date(ts).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "";
  const ok = entry.status === "success";
  return (
    <div className={cn(
      "flex items-start gap-2 rounded-md border p-2.5 text-xs",
      ok ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
         : "border-amber-500/30 bg-amber-500/5 text-amber-300",
    )}>
      {ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">
          {platform === "twitch" ? "Twitch mis à jour" : "Live YouTube créé"} · {date}
        </p>
        {platform === "twitch" && entry.game_name && (
          <p className="text-muted-foreground">Catégorie : {entry.game_name}</p>
        )}
        {platform === "youtube" && entry.youtube_watch_url && (
          <a
            href={entry.youtube_watch_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Ouvrir dans YouTube <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}


function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Brouillon", cls: "border-border bg-muted text-muted-foreground" },
    ready: { label: "Prêt", cls: "border-primary/40 bg-primary/10 text-primary" },
    pushed: { label: "Poussé", cls: "border-blue-500/40 bg-blue-500/10 text-blue-400" },
    completed: { label: "Terminé", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium", s.cls)}>
      {s.label}
    </span>
  );
}

export default LiveSetupPage;
