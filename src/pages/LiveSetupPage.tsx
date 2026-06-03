import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Rocket, Save, Sparkles, Tv, Video, Music2, Camera,
  CheckCircle2, Copy, Trash2, Clock, ChevronRight, ListChecks, Wand2,
  ExternalLink, AlertTriangle, Loader2, MonitorPlay, Settings2, Flag,
  CircleDashed, ShieldCheck, Film,
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
import {
  useLiveSessions, type LiveSession, type LiveSessionStatus,
} from "@/hooks/useLiveSessions";
import {
  generateMetadata, DEFAULT_CHECKLIST_ITEMS,
  type LiveSetupInput, type LiveTargetPlatform, type LiveTone, type GeneratedMetadata,
} from "@/services/liveSetupGenerator";
import {
  LIVE_PRESETS, getPreset, type LivePresetId, type ObsChecklistItem,
} from "@/services/obsPresets";
import {
  generatePostLiveBrief, PLATFORM_LABEL, PRIORITY_LABEL,
  type PostLiveBrief, type ContentIdea, type ContentPriority,
} from "@/services/postLiveBrief";
import { Flame, StopCircle, Lightbulb, CalendarDays, Repeat2, Inbox } from "lucide-react";
import { useContentItems } from "@/hooks/useContentItems";

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

const EMPTY_PRELIVE_CHECKLIST = DEFAULT_CHECKLIST_ITEMS.reduce<Record<string, boolean>>(
  (acc, i) => ({ ...acc, [i.id]: false }), {},
);

function copy(value: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success("Copié"),
    () => toast.error("Copie impossible"),
  );
}

interface LiveSetupV2Extras {
  preset?: LivePresetId | null;
  obs_checklist?: Record<string, boolean>;
  skip_twitch?: boolean;
  skip_youtube?: boolean;
  title_confirmed?: boolean;
  ready_to_go_at?: string;
  ended_at?: string;
  post_live_brief?: PostLiveBrief;
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

function readExtras(meta: unknown): LiveSetupV2Extras {
  if (!meta || typeof meta !== "object") return {};
  const m = meta as { live_setup_v2?: LiveSetupV2Extras };
  return m.live_setup_v2 ?? {};
}

const LiveSetupPage = () => {
  const { accounts } = useConnectedNetworks();
  const { isConnected: twitchConnected } = useTwitchConnection();
  const { sessions, loading, saveSession, deleteSession, refetch } = useLiveSessions();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [input, setInput] = useState<LiveSetupInput>(EMPTY_INPUT);
  const [preliveChecklist, setPreliveChecklist] = useState<Record<string, boolean>>(EMPTY_PRELIVE_CHECKLIST);
  const [obsChecklist, setObsChecklist] = useState<Record<string, boolean>>({});
  const [presetId, setPresetId] = useState<LivePresetId | null>(null);
  const [skipTwitch, setSkipTwitch] = useState(false);
  const [skipYouTube, setSkipYouTube] = useState(false);
  const [titleConfirmed, setTitleConfirmed] = useState(false);
  const [metadata, setMetadata] = useState<GeneratedMetadata>(() => generateMetadata(EMPTY_INPUT));
  const [saving, setSaving] = useState(false);
  const [pushingTwitch, setPushingTwitch] = useState(false);
  const [pushingYouTube, setPushingYouTube] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [endingLive, setEndingLive] = useState(false);
  const [ytPrivacy, setYtPrivacy] = useState<"private" | "unlisted" | "public">("private");

  const youtubeConnected = useMemo(
    () => accounts.some(a => a.platform === "youtube" && a.connection_status === "connected"),
    [accounts],
  );

  const editingSession = useMemo(
    () => sessions.find(s => s.id === editingId) ?? null,
    [sessions, editingId],
  );

  // Active preset (or null = generic baseline).
  const activePreset = useMemo(() => getPreset(presetId), [presetId]);

  // OBS checklist items derived from active preset (or generic baseline).
  const obsItems: ObsChecklistItem[] = useMemo(() => {
    if (activePreset) return activePreset.obsChecklist;
    // Generic baseline if no preset chosen yet.
    return LIVE_PRESETS[0].obsChecklist;
  }, [activePreset]);

  useEffect(() => {
    setMetadata(generateMetadata(input));
  }, [input]);

  // When a preset is selected, suggest its tone if user hasn't set one yet.
  useEffect(() => {
    if (activePreset && !input.tone) {
      setInput(prev => ({ ...prev, tone: activePreset.suggestedTone }));
    }
    // Ensure obs checklist contains all expected keys for the active preset.
    setObsChecklist(prev => {
      const next: Record<string, boolean> = { ...prev };
      for (const it of obsItems) {
        if (!(it.id in next)) next[it.id] = false;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  const preliveProgress = useMemo(() => {
    const total = DEFAULT_CHECKLIST_ITEMS.length;
    const done = DEFAULT_CHECKLIST_ITEMS.filter(i => preliveChecklist[i.id]).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [preliveChecklist]);

  const obsProgress = useMemo(() => {
    const total = obsItems.length;
    const done = obsItems.filter(i => obsChecklist[i.id]).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [obsItems, obsChecklist]);

  // Push state — derived from persisted session metadata.
  const sessionMeta = editingSession?.generated_metadata as Record<string, unknown> | undefined;
  const sessionExtras = readExtras(sessionMeta);
  const existingBrief: PostLiveBrief | null = sessionExtras.post_live_brief ?? null;
  const isCompleted = editingSession?.status === "completed";
  const twitchPush = sessionMeta?.twitch_push as PushEntry | undefined;
  const youtubePush = sessionMeta?.youtube_push as PushEntry | undefined;
  const twitchDone = !!twitchPush && twitchPush.status === "success";
  const youtubeDone = !!youtubePush && youtubePush.status === "success";

  // ready_to_go criteria:
  //  - Twitch configured OR explicitly skipped
  //  - YouTube created OR explicitly skipped
  //  - OBS checklist fully validated
  //  - Final title confirmed
  const readyToGo = useMemo(() => {
    const twitchOk = twitchDone || skipTwitch;
    const youtubeOk = youtubeDone || skipYouTube;
    const obsOk = obsItems.length > 0 && obsItems.every(i => obsChecklist[i.id]);
    const titleOk = titleConfirmed && (metadata.twitch.title.trim().length > 0 || metadata.youtube.title.trim().length > 0);
    return { twitchOk, youtubeOk, obsOk, titleOk, all: twitchOk && youtubeOk && obsOk && titleOk };
  }, [twitchDone, skipTwitch, youtubeDone, skipYouTube, obsItems, obsChecklist, titleConfirmed, metadata]);

  const resetForm = () => {
    setEditingId(null);
    setInput(EMPTY_INPUT);
    setPreliveChecklist(EMPTY_PRELIVE_CHECKLIST);
    setObsChecklist({});
    setPresetId(null);
    setSkipTwitch(false);
    setSkipYouTube(false);
    setTitleConfirmed(false);
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
    setPreliveChecklist({ ...EMPTY_PRELIVE_CHECKLIST, ...(s.checklist || {}) });
    const extras = readExtras(s.generated_metadata);
    setPresetId(extras.preset ?? null);
    setObsChecklist(extras.obs_checklist ?? {});
    setSkipTwitch(!!extras.skip_twitch);
    setSkipYouTube(!!extras.skip_youtube);
    setTitleConfirmed(!!extras.title_confirmed);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Build the metadata payload, preserving existing push history so we don't
  // overwrite twitch_push / youtube_push entries with each save.
  function buildMetadataPayload(): GeneratedMetadata & Record<string, unknown> {
    const existing = (editingSession?.generated_metadata ?? {}) as Record<string, unknown>;
    const extras: LiveSetupV2Extras = {
      preset: presetId,
      obs_checklist: obsChecklist,
      skip_twitch: skipTwitch,
      skip_youtube: skipYouTube,
      title_confirmed: titleConfirmed,
      ready_to_go_at: (existing.live_setup_v2 as LiveSetupV2Extras | undefined)?.ready_to_go_at,
    };
    return {
      ...metadata,
      ...(existing.twitch_push ? { twitch_push: existing.twitch_push } : {}),
      ...(existing.youtube_push ? { youtube_push: existing.youtube_push } : {}),
      live_setup_v2: extras,
    } as GeneratedMetadata & Record<string, unknown>;
  }

  const handleSave = async (status: LiveSessionStatus) => {
    if (!input.titleRaw.trim() && !input.gameCategory.trim()) {
      toast.error("Renseigne au moins un titre ou une catégorie");
      return;
    }
    setSaving(true);
    try {
      await saveSession({
        id: editingId ?? undefined,
        input,
        metadata: buildMetadataPayload(),
        checklist: preliveChecklist,
        status,
      });
      toast.success(
        status === "ready" ? "Session prête"
        : status === "ready_to_go" ? "Session prête à lancer 🚀"
        : "Brouillon sauvegardé",
      );
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

  async function ensureSavedSession(): Promise<string | null> {
    if (editingId) {
      // Persist current state (skip flags, obs checklist…) before pushing.
      try {
        await saveSession({
          id: editingId, input,
          metadata: buildMetadataPayload(),
          checklist: preliveChecklist, status: "ready",
        });
      } catch { /* non-blocking */ }
      return editingId;
    }
    if (!input.titleRaw.trim() && !input.gameCategory.trim()) {
      toast.error("Renseigne au moins un titre ou une catégorie");
      return null;
    }
    setSaving(true);
    try {
      const created = await saveSession({
        input, metadata: buildMetadataPayload(),
        checklist: preliveChecklist, status: "ready",
      });
      if (created?.id) { setEditingId(created.id); return created.id; }
      return null;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de sauvegarde");
      return null;
    } finally { setSaving(false); }
  }

  function handlePushError(reason: string | undefined, platform: "twitch" | "youtube", category?: string) {
    switch (reason) {
      case "twitch_not_connected": toast.error("Twitch non connecté"); break;
      case "youtube_not_connected": toast.error("YouTube non connecté"); break;
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

  async function readInvokeOutcome(data: unknown, error: unknown):
  Promise<{ success: boolean; reason?: string }> {
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
        body: { live_session_id: sessionId, title, category, language: input.language || undefined },
      });
      const outcome = await readInvokeOutcome(data, error);
      if (!outcome.success) { handlePushError(outcome.reason, "twitch", category); return; }
      // Push success = Twitch is "done", so unset the skip flag.
      if (skipTwitch) setSkipTwitch(false);
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
    if (input.scheduledAt) {
      const t = Date.parse(input.scheduledAt);
      if (!Number.isFinite(t) || t < Date.now() - 60_000) {
        toast.error("La date programmée doit être dans le futur."); return;
      }
    }
    const sessionId = await ensureSavedSession();
    if (!sessionId) return;
    setPushingYouTube(true);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-create-live-broadcast", {
        body: {
          live_session_id: sessionId, title,
          description: metadata.youtube.description,
          scheduled_start_time: input.scheduledAt || undefined,
          privacy_status: ytPrivacy,
          language: input.language || undefined,
        },
      });
      const outcome = await readInvokeOutcome(data, error);
      if (!outcome.success) { handlePushError(outcome.reason, "youtube"); return; }
      if (skipYouTube) setSkipYouTube(false);
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

  async function handleMarkReadyToGo() {
    if (!readyToGo.all) {
      toast.error("Termine d'abord toutes les étapes du plan de lancement.");
      return;
    }
    setMarkingReady(true);
    try {
      const existing = (editingSession?.generated_metadata ?? {}) as Record<string, unknown>;
      const extras: LiveSetupV2Extras = {
        preset: presetId, obs_checklist: obsChecklist,
        skip_twitch: skipTwitch, skip_youtube: skipYouTube,
        title_confirmed: titleConfirmed,
        ready_to_go_at: new Date().toISOString(),
      };
      const metaPayload = {
        ...metadata,
        ...(existing.twitch_push ? { twitch_push: existing.twitch_push } : {}),
        ...(existing.youtube_push ? { youtube_push: existing.youtube_push } : {}),
        live_setup_v2: extras,
      } as GeneratedMetadata & Record<string, unknown>;
      await saveSession({
        id: editingId ?? undefined,
        input, metadata: metaPayload,
        checklist: preliveChecklist, status: "ready_to_go",
      });
      toast.success("Prêt à lancer 🚀 Ouvre OBS et démarre ton stream.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setMarkingReady(false); }
  }

  async function handleEndLive() {
    if (!editingId) {
      toast.error("Sauvegarde d'abord la session.");
      return;
    }
    if (!confirm("Marquer ce live comme terminé et générer le post-live brief ?")) return;
    setEndingLive(true);
    try {
      const existing = (editingSession?.generated_metadata ?? {}) as Record<string, unknown>;
      const prevExtras = (existing.live_setup_v2 ?? {}) as LiveSetupV2Extras;
      const brief = generatePostLiveBrief({
        input, metadata,
        preset: activePreset,
        twitchPushed: twitchDone,
        twitchTitle: twitchPush?.title ?? null,
        youtubeCreated: youtubeDone,
        youtubeWatchUrl: youtubePush?.youtube_watch_url ?? null,
      });
      const extras: LiveSetupV2Extras = {
        ...prevExtras,
        preset: presetId, obs_checklist: obsChecklist,
        skip_twitch: skipTwitch, skip_youtube: skipYouTube,
        title_confirmed: titleConfirmed,
        ended_at: new Date().toISOString(),
        post_live_brief: brief,
      };
      const metaPayload = {
        ...metadata,
        ...(existing.twitch_push ? { twitch_push: existing.twitch_push } : {}),
        ...(existing.youtube_push ? { youtube_push: existing.youtube_push } : {}),
        live_setup_v2: extras,
      } as GeneratedMetadata & Record<string, unknown>;
      await saveSession({
        id: editingId, input, metadata: metaPayload,
        checklist: preliveChecklist, status: "completed",
      });
      toast.success("Live terminé ✅ Brief post-live généré.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setEndingLive(false); }
  }

  async function handleRegenerateBrief() {
    if (!editingId || !isCompleted) {
      toast.error("Le brief ne peut être régénéré que sur une session terminée.");
      return;
    }
    if (!confirm("Régénérer le post-live brief ? L'ancien brief sera remplacé.")) return;
    try {
      const existing = (editingSession?.generated_metadata ?? {}) as Record<string, unknown>;
      const prevExtras = (existing.live_setup_v2 ?? {}) as LiveSetupV2Extras;
      const brief = generatePostLiveBrief({
        input, metadata,
        preset: activePreset,
        twitchPushed: twitchDone,
        twitchTitle: twitchPush?.title ?? null,
        youtubeCreated: youtubeDone,
        youtubeWatchUrl: youtubePush?.youtube_watch_url ?? null,
      });
      const extras: LiveSetupV2Extras = {
        ...prevExtras,
        post_live_brief: brief, // replaces existing brief, no duplicate
      };
      const metaPayload = {
        ...metadata,
        ...(existing.twitch_push ? { twitch_push: existing.twitch_push } : {}),
        ...(existing.youtube_push ? { youtube_push: existing.youtube_push } : {}),
        live_setup_v2: extras,
      } as GeneratedMetadata & Record<string, unknown>;
      await saveSession({
        id: editingId, input, metadata: metaPayload,
        checklist: preliveChecklist, status: "completed",
      });
      toast.success("Post-live brief régénéré ✅");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la régénération");
    }
  }




  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <PageContainer size="lg">
        <PageHeader
          eyebrow="Cockpit pré-live"
          title="Live Setup"
          description="Configure ton live, valide ton matos OBS, et lance-toi avec un seul réflexe : ouvrir OBS."
          action={editingId ? (
            <Button variant="outline" size="sm" onClick={resetForm}>Nouvelle session</Button>
          ) : null}
        />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* ── LEFT: Form + presets + checklist + OBS assistant ─────────── */}
          <div className="space-y-6">
            {/* Preset selector */}
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Type de live (preset)
                </div>
                <p className="text-xs text-muted-foreground">
                  Choisis un preset pour adapter automatiquement la checklist OBS, le ton du titre,
                  les moments à prévoir et les clips à viser.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {LIVE_PRESETS.map((p) => {
                    const active = presetId === p.id;
                    return (
                      <button
                        key={p.id} type="button"
                        onClick={() => setPresetId(active ? null : p.id)}
                        className={cn(
                          "rounded-md border p-3 text-left transition",
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border/60 bg-card hover:border-border",
                        )}
                      >
                        <div className="text-sm font-medium text-foreground">{p.label}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {p.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Idea form */}
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Wand2 className="h-4 w-4 text-primary" />
                  Idée du live
                </div>

                <div className="space-y-2">
                  <Label htmlFor="titleRaw">Titre brut / idée du live</Label>
                  <Input
                    id="titleRaw" value={input.titleRaw}
                    onChange={(e) => { setInput({ ...input, titleRaw: e.target.value }); setTitleConfirmed(false); }}
                    placeholder="Ex : Ranked tryhard jusqu'à Diamant"
                    maxLength={140}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="game">Jeu ou catégorie</Label>
                    <Input
                      id="game" value={input.gameCategory}
                      onChange={(e) => setInput({ ...input, gameCategory: e.target.value })}
                      placeholder="Ex : Valorant" maxLength={80}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="objective">Objectif du live</Label>
                    <Input
                      id="objective" value={input.objective}
                      onChange={(e) => setInput({ ...input, objective: e.target.value })}
                      placeholder="Ex : monter Diamant 2" maxLength={120}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tone">Ton souhaité</Label>
                    <Select value={input.tone || undefined}
                      onValueChange={(v) => setInput({ ...input, tone: v as LiveTone })}>
                      <SelectTrigger id="tone"><SelectValue placeholder="Choisir un ton" /></SelectTrigger>
                      <SelectContent>
                        {TONES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lang">Langue</Label>
                    <Select value={input.language}
                      onValueChange={(v) => setInput({ ...input, language: v })}>
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
                      id="audience" value={input.targetAudience}
                      onChange={(e) => setInput({ ...input, targetAudience: e.target.value })}
                      placeholder="Ex : joueurs FR niveau intermédiaire" maxLength={160}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="scheduled">Date / heure (optionnel)</Label>
                    <Input
                      id="scheduled" type="datetime-local"
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
                          key={value} type="button"
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

            {/* OBS Assistant */}
            <Card className="border-border/60">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MonitorPlay className="h-4 w-4 text-primary" />
                    OBS Assistant
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {obsProgress.done}/{obsProgress.total}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TechBlock label="Résolution" value={activePreset?.obsTechnical.resolution ?? "1920x1080"} />
                  <TechBlock label="FPS" value={activePreset?.obsTechnical.fps ?? "60 fps"} />
                  <TechBlock label="Bitrate" value={activePreset?.obsTechnical.bitrateKbps ?? "6000 kbps"} />
                  <TechBlock label="Encodeur" value={activePreset?.obsTechnical.encoder ?? "NVENC (recommandé)"} />
                </div>
                {activePreset?.obsTechnical.notes && (
                  <p className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground">
                    {activePreset.obsTechnical.notes}
                  </p>
                )}

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all"
                    style={{ width: `${obsProgress.pct}%` }} />
                </div>

                <ul className="grid gap-2 sm:grid-cols-2">
                  {obsItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`obs-${item.id}`}
                        checked={!!obsChecklist[item.id]}
                        onCheckedChange={(v) =>
                          setObsChecklist((prev) => ({ ...prev, [item.id]: v === true }))
                        }
                      />
                      <Label htmlFor={`obs-${item.id}`}
                        className={cn(
                          "cursor-pointer text-xs leading-tight",
                          obsChecklist[item.id] ? "text-muted-foreground line-through" : "text-foreground",
                        )}
                      >
                        {item.label}
                      </Label>
                    </li>
                  ))}
                </ul>

                {activePreset && (
                  <div className="grid gap-4 pt-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Flag className="h-3.5 w-3.5 text-primary" /> Moments à prévoir
                      </div>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {activePreset.momentsToPlan.map((m, i) => (
                          <li key={i} className="flex gap-1.5"><span>•</span><span>{m}</span></li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Film className="h-3.5 w-3.5 text-primary" /> Clips à viser
                      </div>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {activePreset.clipRecommendations.map((c, i) => (
                          <li key={i} className="flex gap-1.5"><span>•</span><span>{c}</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pre-live checklist */}
            <Card className="border-border/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ListChecks className="h-4 w-4 text-primary" />
                    Checklist générale
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {preliveProgress.done}/{preliveProgress.total}
                  </Badge>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all"
                    style={{ width: `${preliveProgress.pct}%` }} />
                </div>
                <ul className="space-y-2">
                  {DEFAULT_CHECKLIST_ITEMS.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`chk-${item.id}`}
                        checked={!!preliveChecklist[item.id]}
                        onCheckedChange={(v) =>
                          setPreliveChecklist((prev) => ({ ...prev, [item.id]: v === true }))
                        }
                      />
                      <Label htmlFor={`chk-${item.id}`}
                        className={cn(
                          "cursor-pointer text-sm",
                          preliveChecklist[item.id] ? "text-muted-foreground line-through" : "text-foreground",
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

          {/* ── RIGHT: Preview + actions + launch plan + sessions ────────── */}
          <div className="space-y-6">
            {/* Generated metadata */}
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
                      disabledReason={
                        !metadata.twitch.title.trim() && !metadata.twitch.category.trim()
                          ? "Ajoute un titre ou une catégorie pour activer le push."
                          : undefined
                      }
                      labelConnected="Mettre à jour Twitch"
                      labelMissing="Connecte Twitch"
                      onPush={handlePushTwitch}
                    />
                    <SkipToggle
                      label="Je préfère configurer Twitch manuellement"
                      checked={skipTwitch}
                      disabled={twitchDone}
                      onChange={setSkipTwitch}
                    />
                    <PushHistory entry={twitchPush} platform="twitch" />
                  </TabsContent>

                  <TabsContent value="youtube" className="space-y-3 pt-4">
                    <PreviewField label="Titre YouTube" value={metadata.youtube.title} />
                    <PreviewField label="Description" value={metadata.youtube.description} multiline />
                    <PreviewField label="Tags" value={metadata.youtube.tags.join(", ") || "—"} />
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
                      disabledReason={
                        !metadata.youtube.title.trim()
                          ? "Ajoute un titre pour activer la création du live."
                          : undefined
                      }
                      labelConnected="Créer un live YouTube"
                      labelMissing="Connecte YouTube"
                      onPush={handlePushYouTube}
                    />
                    <SkipToggle
                      label="Je préfère configurer YouTube manuellement"
                      checked={skipYouTube}
                      disabled={youtubeDone}
                      onChange={setSkipYouTube}
                    />
                    <PushHistory entry={youtubePush} platform="youtube" />
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

            {/* Live Launch Plan */}
            <Card className={cn(
              "border-2 transition",
              readyToGo.all
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent",
            )}>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Rocket className="h-4 w-4 text-primary" />
                  Plan de lancement
                </div>

                <ul className="space-y-2 text-sm">
                  <LaunchStep
                    done={readyToGo.twitchOk}
                    label={twitchDone ? "Twitch configuré" : skipTwitch ? "Twitch ignoré (manuel)" : "Configurer Twitch"}
                    detail={twitchDone
                      ? `Titre : ${twitchPush?.title ?? metadata.twitch.title}${twitchPush?.game_name ? ` · ${twitchPush.game_name}` : ""}`
                      : "Pousse les métadonnées Twitch, ou ignore pour configurer manuellement."}
                  />
                  <LaunchStep
                    done={readyToGo.youtubeOk}
                    label={youtubeDone ? "Live YouTube créé" : skipYouTube ? "YouTube ignoré (manuel)" : "Créer le live YouTube"}
                    detail={youtubeDone
                      ? `Titre : ${metadata.youtube.title}${youtubePush?.privacy_status ? ` · ${youtubePush.privacy_status}` : ""}`
                      : "Crée le brouillon de live YouTube, ou ignore."}
                    link={youtubePush?.youtube_watch_url
                      ? { href: youtubePush.youtube_watch_url, label: "Ouvrir dans YouTube" }
                      : youtubeDone
                        ? { href: "https://studio.youtube.com/", label: "Ouvrir YouTube Studio" }
                        : undefined}
                  />
                  <LaunchStep
                    done={readyToGo.obsOk}
                    label={`OBS prêt (${obsProgress.done}/${obsProgress.total})`}
                    detail="Coche toute la checklist OBS ci-contre."
                  />
                  <LaunchStep
                    done={readyToGo.titleOk}
                    label="Titre final confirmé"
                    detail={titleConfirmed
                      ? "Tu valides le titre final."
                      : "Confirme que le titre final est celui que tu veux."}
                    action={
                      <Button
                        size="sm" variant={titleConfirmed ? "outline" : "default"}
                        onClick={() => setTitleConfirmed(v => !v)}
                        disabled={!metadata.twitch.title.trim() && !metadata.youtube.title.trim()}
                      >
                        {titleConfirmed ? "Annuler" : "Confirmer"}
                      </Button>
                    }
                  />
                </ul>

                <div className="rounded-md border border-border/60 bg-background/40 p-3 text-sm">
                  {readyToGo.all ? (
                    <p className="flex items-start gap-2 text-emerald-300">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <span><strong>Tout est prêt.</strong> Il ne te reste qu'à ouvrir OBS et démarrer ton stream.</span>
                    </p>
                  ) : (
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span>Termine les étapes ci-dessus pour débloquer « Prêt à lancer ».</span>
                    </p>
                  )}
                </div>

                <Button
                  className="w-full"
                  disabled={!readyToGo.all || markingReady || isCompleted}
                  onClick={handleMarkReadyToGo}
                >
                  {markingReady ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                : <Rocket className="mr-1.5 h-4 w-4" />}
                  Marquer comme « prêt à lancer »
                </Button>

                {editingId && !isCompleted && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={endingLive}
                    onClick={handleEndLive}
                  >
                    {endingLive ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                : <StopCircle className="mr-1.5 h-4 w-4" />}
                    Terminer le live & générer le brief
                  </Button>
                )}
                {isCompleted && sessionExtras.ended_at && (
                  <p className="text-center text-xs text-muted-foreground">
                    Live terminé le {new Date(sessionExtras.ended_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Post-live brief */}
            {existingBrief && (
              <PostLiveBriefCard
                brief={existingBrief}
                liveSessionId={editingId}
                canRegenerate={isCompleted}
                onRegenerate={handleRegenerateBrief}
              />
            )}

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
                    {sessions.map((s) => {
                      const meta = s.generated_metadata as Record<string, unknown> | undefined;
                      const tp = meta?.twitch_push as PushEntry | undefined;
                      const yp = meta?.youtube_push as PushEntry | undefined;
                      const extras = readExtras(meta);
                      const actions: string[] = [];
                      if (tp?.status === "success") actions.push("Twitch ✓");
                      if (yp?.status === "success") actions.push("YouTube ✓");
                      if (extras.skip_twitch && !tp) actions.push("Twitch ignoré");
                      if (extras.skip_youtube && !yp) actions.push("YouTube ignoré");
                      return (
                        <li
                          key={s.id}
                          className={cn(
                            "group flex items-center gap-3 rounded-md border p-3 transition",
                            editingId === s.id
                              ? "border-primary bg-primary/5"
                              : "border-border/60 hover:border-border",
                          )}
                        >
                          <button type="button" onClick={() => loadSession(s)}
                            className="min-w-0 flex-1 text-left">
                            <p className="truncate text-sm font-medium text-foreground">
                              {s.title_raw || s.game_category || "Sans titre"}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              <StatusPill status={s.status} />
                              {s.game_category && <span className="truncate">· {s.game_category}</span>}
                              {actions.length > 0 && <span>· {actions.join(" · ")}</span>}
                            </p>
                          </button>
                          <Button variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(s.id)} aria-label="Supprimer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed border-border/60 bg-muted/20">
              <CardContent className="p-4 text-xs text-muted-foreground">
                <Rocket className="mb-1.5 inline h-3.5 w-3.5 text-primary" />{" "}
                Streamnco ne contrôle pas OBS et ne fait pas de multistreaming.
                Cette page t'aide à arriver « prêt à lancer » avant d'ouvrir OBS.
                Connecte tes plateformes depuis{" "}
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
        <Button variant="ghost" size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => copy(value)}>
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

function TechBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function SkipToggle({ label, checked, disabled, onChange }: {
  label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className={cn(
      "flex items-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-2 text-xs",
      disabled ? "opacity-60" : "cursor-pointer hover:border-border",
    )}>
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange(v === true)}
      />
      <span className="text-muted-foreground">{label}</span>
    </label>
  );
}

function PushActionRow({
  icon, connected, busy, labelConnected, labelMissing, onPush, disabledReason,
}: {
  icon: React.ReactNode; connected: boolean; busy: boolean;
  labelConnected: string; labelMissing: string; onPush: () => void;
  disabledReason?: string;
}) {
  const disabled = !!disabledReason;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{connected ? labelConnected : labelMissing}</span>
      </div>
      {connected ? (
        <Button size="sm" onClick={onPush} disabled={busy || disabled} title={disabledReason}>
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
          {busy ? "Envoi…" : "Envoyer"}
        </Button>
      ) : (
        <Button size="sm" variant="outline" asChild>
          <Link to="/reseaux">Connecter</Link>
        </Button>
      )}
      {connected && disabled && (
        <p className="text-xs text-muted-foreground sm:basis-full">{disabledReason}</p>
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
          <a href={entry.youtube_watch_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline">
            Ouvrir dans YouTube <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function LaunchStep({
  done, label, detail, link, action,
}: {
  done: boolean; label: string; detail?: string;
  link?: { href: string; label: string };
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-border/60 bg-background/40 p-3">
      {done
        ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", done ? "text-foreground" : "text-foreground/90")}>
          {label}
        </p>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
        {link && (
          <a href={link.href} target="_blank" rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
            {link.label} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {action}
    </li>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Brouillon", cls: "border-border bg-muted text-muted-foreground" },
    ready: { label: "Prêt", cls: "border-primary/40 bg-primary/10 text-primary" },
    pushed: { label: "Poussé", cls: "border-blue-500/40 bg-blue-500/10 text-blue-400" },
    ready_to_go: { label: "Prêt à lancer", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
    completed: { label: "Terminé", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium", s.cls)}>
      {s.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ContentPriority }) {
  const cls = priority === "high"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : priority === "medium"
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium", cls)}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function ContentIdeaRow({ idea }: { idea: ContentIdea }) {
  return (
    <li className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{idea.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{PLATFORM_LABEL[idea.platform]} · {idea.format}{idea.duration ? ` · ${idea.duration}` : ""}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <PriorityBadge priority={idea.priority} />
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => copy(idea.title)} aria-label="Copier le titre">
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground/90">{idea.reason}</p>
    </li>
  );
}

function PostLiveBriefCard({ brief, liveSessionId }: { brief: PostLiveBrief; liveSessionId: string | null }) {
  const generated = new Date(brief.generated_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  const platforms = brief.summary.platforms_used.length > 0
    ? brief.summary.platforms_used.join(", ")
    : "—";
  const { items, createMany } = useContentItems();
  const [sending, setSending] = useState(false);
  const alreadyQueued = useMemo(
    () => liveSessionId
      ? items.filter(i => i.live_session_id === liveSessionId).length
      : 0,
    [items, liveSessionId],
  );

  async function handleSendToQueue() {
    if (!liveSessionId) { toast.error("Sauvegarde la session avant."); return; }
    setSending(true);
    try {
      const rows = brief.content_ideas.map((idea) => ({
        live_session_id: liveSessionId,
        platform: idea.platform,
        title: idea.title,
        description: undefined,
        hashtags: [],
        status: "idea" as const,
        priority: idea.priority,
        source_idea_id: idea.id,
        format: idea.format,
        duration: idea.duration ?? null,
        reason: idea.reason,
      }));
      const count = await createMany(rows);
      toast.success(`${count} idée${count > 1 ? "s" : ""} envoyée${count > 1 ? "s" : ""} dans Content Queue`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setSending(false); }
  }

  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Flame className="h-4 w-4 text-emerald-400" />
            Post-live Brief
          </div>
          <Badge variant="outline" className="text-xs">Généré le {generated}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Inbox className="h-3.5 w-3.5 text-primary" />
            {alreadyQueued > 0
              ? `${alreadyQueued} contenu(s) déjà dans la queue pour ce live`
              : "Envoie les idées dans la Content Queue pour les produire."}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={handleSendToQueue} disabled={sending}>
              {sending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Inbox className="mr-1.5 h-3.5 w-3.5" />}
              Envoyer dans la queue
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/content-queue">Ouvrir la queue</Link>
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-2 sm:grid-cols-2">
          <SummaryRow label="Plateformes" value={platforms} />
          <SummaryRow label="Angle principal" value={brief.summary.main_angle} />
          <SummaryRow label="Titre Twitch final" value={brief.summary.twitch_title || "—"} />
          <SummaryRow
            label="Live YouTube"
            value={brief.summary.youtube_created ? "Créé" : "Non créé"}
            link={brief.summary.youtube_watch_url || undefined}
          />
          {brief.summary.game_category && <SummaryRow label="Catégorie" value={brief.summary.game_category} />}
          {brief.summary.objective && <SummaryRow label="Objectif" value={brief.summary.objective} />}
        </div>

        {/* Content opportunities */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-primary" /> Opportunités de contenu
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {brief.content_opportunities.map((o, i) => (
              <li key={i} className="flex gap-1.5"><span>•</span><span>{o}</span></li>
            ))}
          </ul>
        </div>

        {/* Recommended actions */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Actions recommandées
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {brief.recommended_actions.map((a, i) => (
              <li key={i} className="flex gap-1.5"><span>•</span><span>{a}</span></li>
            ))}
          </ul>
        </div>

        {/* Content ideas */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Film className="h-3.5 w-3.5 text-primary" /> Moments à produire
          </div>
          <ul className="space-y-2">
            {brief.content_ideas.map((idea) => (<ContentIdeaRow key={idea.id} idea={idea} />))}
          </ul>
        </div>

        {/* Recycling plan */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Repeat2 className="h-3.5 w-3.5 text-primary" /> Plan de recyclage 48h
          </div>
          <ul className="space-y-1.5">
            {brief.recycling_plan.map((step, i) => (
              <li key={i} className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 p-2 text-xs">
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="font-medium text-foreground">{step.day}</span>
                <span className="text-muted-foreground">{step.action}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</div>
      {link && (
        <a href={link} target="_blank" rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Ouvrir <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

export default LiveSetupPage;
