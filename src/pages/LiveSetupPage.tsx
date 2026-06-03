import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { buildQualityPackForIdea } from "@/services/contentQuality";
import SuggestedTitles from "@/components/live-setup/SuggestedTitles";
import {
  LEADER_CATEGORY_PRESETS,
  searchCategories,
  fetchPresetCategories,
  type LeaderCategory,
} from "@/services/leadersService";

const TONES: { value: LiveTone; label: string }[] = [
  { value: "chill", label: "Détente" },
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
  const [lastAppliedTitle, setLastAppliedTitle] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0=idea 1=push 2=obs 3=launch
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categorySuggestions, setCategorySuggestions] = useState<LeaderCategory[]>([]);
  const [categorySearching, setCategorySearching] = useState(false);
  const [presetCategoryData, setPresetCategoryData] = useState<LeaderCategory[] | null>(null);

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

  // When the preset changes, align the live tone on the preset's suggested
  // tone so every downstream metadata (Twitch/YouTube/Kick/social) regenerates
  // through the [input] effect below. Switching preset is a deliberate
  // structural change, so we overwrite tone — manual tone tweaks can be
  // re-applied after.
  useEffect(() => {
    if (activePreset) {
      setInput(prev => {
        const toneChanged = prev.tone !== activePreset.suggestedTone;
        const objectiveEmpty = !prev.objective.trim();
        if (!toneChanged && !objectiveEmpty) return prev;
        return {
          ...prev,
          ...(toneChanged ? { tone: activePreset.suggestedTone } : {}),
          ...(objectiveEmpty ? { objective: activePreset.defaultObjective } : {}),
        };
      });
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

  const hasAdvancedValues = useMemo(
    () =>
      !!input.tone ||
      input.language !== "fr" ||
      !!input.targetAudience.trim() ||
      !!input.scheduledAt,
    [input],
  );

  useEffect(() => {
    if (hasAdvancedValues) setAdvancedOpen(true);
  }, [hasAdvancedValues]);

  useEffect(() => {
    if (categoryOpen && presetCategoryData === null) {
      fetchPresetCategories().then(setPresetCategoryData);
    }
  }, [categoryOpen, presetCategoryData]);

  useEffect(() => {
    const q = categoryQuery.trim();
    if (q.length < 2) {
      setCategorySuggestions(
        presetCategoryData
          ?? LEADER_CATEGORY_PRESETS.map((name) => ({ id: name, name, box_art_url: null })),
      );
      setCategorySearching(false);
      return;
    }
    setCategorySearching(true);
    const t = setTimeout(async () => {
      const res = await searchCategories(q);
      setCategorySuggestions(res);
      setCategorySearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [categoryQuery, presetCategoryData]);

  const resetForm = () => {
    setEditingId(null);
    setInput(EMPTY_INPUT);
    setPreliveChecklist(EMPTY_PRELIVE_CHECKLIST);
    setObsChecklist({});
    setPresetId(null);
    setSkipTwitch(false);
    setSkipYouTube(false);
    setTitleConfirmed(false);
    setAdvancedOpen(false);
    setCurrentStep(0);
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
    setAdvancedOpen(
      !!(s.tone || (s.language && s.language !== "fr") || s.target_audience || s.scheduled_at || ((s.platforms as LiveTargetPlatform[]) ?? ["twitch"]).length > 1),
    );
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToSection = (id: string) => {
    const idx = workflowStepsIds.indexOf(id);
    if (idx >= 0) setCurrentStep(idx);
  };

  const checkAllObs = () => {
    const all: Record<string, boolean> = {};
    obsItems.forEach(i => { all[i.id] = true; });
    setObsChecklist(all);
  };

  const checkAllPrelive = () => {
    const all: Record<string, boolean> = {};
    DEFAULT_CHECKLIST_ITEMS.forEach(i => { all[i.id] = true; });
    setPreliveChecklist(all);
  };

  const pickCategory = (name: string) => {
    setInput((prev) => ({ ...prev, gameCategory: name }));
    setCategoryOpen(false);
    setCategoryQuery("");
  };

  const workflowStepsIds = ["live-idea", "live-metadata", "live-obs", "live-launch"];

  const activeWorkflowStep = readyToGo.titleOk
    ? !readyToGo.twitchOk || !readyToGo.youtubeOk
      ? "push"
      : !readyToGo.obsOk
        ? "obs"
        : "launch"
    : "idea";

  const workflowSteps = [
    {
      id: "idea",
      number: "01",
      label: "Préparer l'angle",
      done: readyToGo.titleOk,
      current: activeWorkflowStep === "idea",
      detail: titleConfirmed ? "Titre final validé." : "Trouve ton angle et verrouille le titre.",
      targetId: "live-idea",
    },
    {
      id: "push",
      number: "02",
      label: "Configurer les plateformes",
      done: readyToGo.twitchOk && readyToGo.youtubeOk,
      current: activeWorkflowStep === "push",
      detail: readyToGo.twitchOk && readyToGo.youtubeOk
        ? "Twitch et YouTube sont prêts, ou volontairement ignorés."
        : "Pousse les métadonnées Twitch/YouTube ou marque-les en manuel.",
      targetId: "live-metadata",
    },
    {
      id: "obs",
      number: "03",
      label: "Valider le setup",
      done: readyToGo.obsOk,
      current: activeWorkflowStep === "obs",
      detail: readyToGo.obsOk
        ? "Le setup OBS est validé."
        : `Checklist OBS à ${obsProgress.done}/${obsProgress.total}.`,
      targetId: "live-obs",
    },
    {
      id: "launch",
      number: "04",
      label: "Passer au lancement",
      done: readyToGo.all,
      current: activeWorkflowStep === "launch",
      detail: readyToGo.all
        ? "Tout est prêt. Il ne reste qu'à ouvrir OBS."
        : "Le plan de lancement te montre le prochain blocage.",
      targetId: "live-launch",
    },
  ];

  const selectedMetadataTabs = useMemo(() => {
    const tabs: Array<"twitch" | "youtube" | "social" | "kick"> = [];
    if (input.platforms.includes("twitch")) tabs.push("twitch");
    if (input.platforms.includes("youtube")) tabs.push("youtube");
    if (input.platforms.includes("tiktok") || input.platforms.includes("instagram")) tabs.push("kick");
    tabs.push("social");
    return tabs;
  }, [input.platforms]);

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
          title="Live Studio"
          description="Passe d'une idée brute à un lancement propre, sans te perdre dans quinze réglages à la fois."
          action={editingId ? (
            <Button variant="outline" size="sm" onClick={resetForm}>Nouvelle session</Button>
          ) : null}
        />

        <Card className="mb-6 overflow-hidden border-border/60 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.07),transparent_55%)]">
          <CardContent className="p-6">
            <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Parcours de lancement</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Savoir exactement ce qu'il reste à faire avant d'ouvrir OBS.
                </p>
              </div>
              <span className={cn(
                "self-start rounded-full border px-3 py-1 text-[11px] font-semibold sm:self-auto",
                workflowSteps.every(s => s.done)
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-border/50 bg-muted/40 text-muted-foreground",
              )}>
                {workflowSteps.filter(s => s.done).length}/{workflowSteps.length} validées
              </span>
            </div>

            <div className="relative">
              <div className="absolute top-[18px] left-[calc(12.5%+4px)] right-[calc(12.5%+4px)] h-px bg-border/50" />
              <div className="grid grid-cols-4 gap-1">
                {workflowSteps.map((step, idx) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    className="group flex flex-col items-center gap-3 px-1 text-center"
                  >
                    <div className={cn(
                      "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                      step.done
                        ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                        : currentStep === idx
                          ? "border-primary bg-primary/10 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.35)]"
                          : "border-border/50 bg-background/60 text-muted-foreground/40",
                    )}>
                      {step.done
                        ? <CheckCircle2 className="h-4 w-4" />
                        : <span className="text-xs font-bold">{step.number}</span>}
                    </div>
                    <div>
                      <p className={cn(
                        "text-xs font-semibold leading-tight",
                        step.done ? "text-emerald-400" :
                        currentStep === idx ? "text-foreground" : "text-muted-foreground/50",
                      )}>
                        {step.label}
                      </p>
                      <p className={cn(
                        "mt-0.5 hidden text-[10px] leading-snug sm:block",
                        step.done || currentStep === idx ? "text-muted-foreground" : "text-muted-foreground/35",
                      )}>
                        {step.detail}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>


        {/* ── Wizard step content ─────────────────────────────────────── */}

        {/* ── STEP 0: Préparer l'angle ─── */}
        {currentStep === 0 && (
          <div className="space-y-5">
            {/* Plateformes ciblées */}
            <div className="space-y-2">
              <Label>Plateformes ciblées</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(({ value, label, Icon, soon }) => {
                  const active = input.platforms.includes(value);
                  return (
                    <button key={value} type="button" onClick={() => !soon && togglePlatform(value)} disabled={soon}
                      className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition",
                        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-border/80",
                        soon && "cursor-not-allowed opacity-60")}>
                      <Icon className="h-4 w-4" />{label}
                      {soon && <Badge variant="outline" className="ml-1 text-[10px]">bientôt</Badge>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preset */}
            <Card id="live-preset" className="border-border/60 bg-card/60">
              <CardContent className="space-y-4 p-6">
                <StepSectionHeader
                  title="Pré-configuration"
                  description="Un preset adapte automatiquement le ton, la checklist OBS, les moments à provoquer et les clips à viser."
                  icon={<Settings2 className="h-4 w-4 text-primary" />}
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {LIVE_PRESETS.map((p) => {
                    const active = presetId === p.id;
                    return (
                      <button
                        key={p.id} type="button"
                        onClick={() => setPresetId(active ? null : p.id)}
                        className={cn(
                          "group rounded-xl border p-3.5 text-left transition-all duration-150",
                          active
                            ? "border-primary/50 bg-primary/8 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
                            : "border-border/50 bg-background/60 hover:border-border hover:bg-muted/30",
                        )}
                      >
                        {active && (
                          <div className="mb-2 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Actif</span>
                          </div>
                        )}
                        <div className={cn("text-sm font-semibold", active ? "text-foreground" : "text-foreground/90")}>{p.label}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Idea form */}
            <Card id="live-idea" className="border-border/60 bg-card/60">
              <CardContent className="space-y-5 p-6">
                <StepSectionHeader
                  step="01"
                  title="Prépare l'idée du live"
                  description="Commence par l'angle, la catégorie et l'objectif."
                  icon={<Wand2 className="h-4 w-4 text-primary" />}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Catégorie Twitch</Label>
                    <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="h-10 w-full justify-between px-3 text-sm font-normal">
                          <span className={cn("truncate", !input.gameCategory && "text-muted-foreground")}>
                            {input.gameCategory || "Choisir une catégorie"}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput value={categoryQuery} onValueChange={setCategoryQuery} placeholder="Rechercher…" className="h-9" />
                          <CommandList>
                            {categorySearching && (
                              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />Recherche en cours…
                              </div>
                            )}
                            {!categorySearching && categorySuggestions.length === 0 && <CommandEmpty>Aucune catégorie trouvée</CommandEmpty>}
                            {!categorySearching && categorySuggestions.length > 0 && (
                              <CommandGroup heading={categoryQuery.trim().length < 2 ? "Suggestions" : "Résultats"}>
                                {categorySuggestions.map((category) => (
                                  <CommandItem key={category.id} value={category.name} onSelect={() => pickCategory(category.name)} className="gap-2.5">
                                    {category.box_art_url ? (
                                      <img src={category.box_art_url.replace("{width}", "40").replace("{height}", "54")} alt="" className="h-7 w-5 shrink-0 rounded-sm border border-border/60 object-cover" />
                                    ) : (
                                      <div className="h-7 w-5 shrink-0 rounded-sm border border-border/60 bg-muted" />
                                    )}
                                    <span className="truncate font-medium">{category.name}</span>
                                    <CheckCircle2 className={cn("ml-auto h-3.5 w-3.5 shrink-0 text-primary", category.name === input.gameCategory ? "opacity-100" : "opacity-0")} />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="objective">Objectif du live</Label>
                    <Input id="objective" value={input.objective} onChange={(e) => setInput({ ...input, objective: e.target.value })} placeholder="Ex : monter Diamant 2" maxLength={120} />
                  </div>
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
                <SuggestedTitles
                  game={input.gameCategory} objective={input.objective} tone={input.tone}
                  audience={input.targetAudience} presetLabel={activePreset?.label ?? null}
                  currentTitle={input.titleRaw} lastAppliedTitle={lastAppliedTitle}
                  onApply={(t) => { setInput(prev => ({ ...prev, titleRaw: t })); setLastAppliedTitle(t); setTitleConfirmed(true); }}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {titleConfirmed ? "Titre final validé ✓" : "Titre encore à confirmer"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {titleConfirmed
                        ? "Ce titre servira de base aux variantes Twitch, YouTube et social."
                        : "Verrouille le titre quand il est bon."}
                    </p>
                  </div>
                  <Button
                    size="sm" variant={titleConfirmed ? "outline" : "default"}
                    onClick={() => setTitleConfirmed(v => !v)}
                    disabled={!input.titleRaw.trim() && !metadata.youtube.title.trim()}
                  >
                    {titleConfirmed ? "Annuler la validation" : "Confirmer le titre"}
                  </Button>
                </div>

                {/* Advanced options */}
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">Options avancées</p>
                    <Button variant="outline" size="sm" onClick={() => setAdvancedOpen(v => !v)}>
                      {advancedOpen ? "Masquer" : "Afficher"}
                    </Button>
                  </div>
                  {advancedOpen && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Ton souhaité</Label>
                        <Select value={input.tone || undefined} onValueChange={(v) => setInput({ ...input, tone: v as LiveTone })}>
                          <SelectTrigger><SelectValue placeholder="Choisir un ton" /></SelectTrigger>
                          <SelectContent>{TONES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Langue</Label>
                        <Select value={input.language} onValueChange={(v) => setInput({ ...input, language: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Audience cible</Label>
                        <Input value={input.targetAudience} onChange={(e) => setInput({ ...input, targetAudience: e.target.value })} placeholder="Ex : joueurs FR niveau intermédiaire" maxLength={160} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Date / heure (optionnel)</Label>
                        <Input type="datetime-local" value={input.scheduledAt ? input.scheduledAt.slice(0, 16) : ""}
                          onChange={(e) => setInput({ ...input, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 0 navigation */}
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
                <Save className="mr-1.5 h-4 w-4" />Sauvegarder le brouillon
              </Button>
              <Button onClick={() => setCurrentStep(1)} disabled={!input.titleRaw.trim() && !input.gameCategory.trim()}>
                Configurer les plateformes →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Configurer les plateformes ─── */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <Card id="live-metadata" className="border-primary/25 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6">
                <StepSectionHeader
                  step="02"
                  title="Génère puis pousse les métadonnées"
                  description="Affiche uniquement les destinations utiles pour alléger la lecture."
                  icon={<Sparkles className="h-4 w-4 text-primary" />}
                />
                <Tabs defaultValue={selectedMetadataTabs[0] ?? "social"} className="mt-5">
                  <TabsList className={cn("grid w-full",
                    selectedMetadataTabs.length === 2 && "grid-cols-2",
                    selectedMetadataTabs.length === 3 && "grid-cols-3",
                    selectedMetadataTabs.length >= 4 && "grid-cols-4")}>
                    {selectedMetadataTabs.includes("twitch") && <TabsTrigger value="twitch">Twitch</TabsTrigger>}
                    {selectedMetadataTabs.includes("youtube") && <TabsTrigger value="youtube">YouTube</TabsTrigger>}
                    {selectedMetadataTabs.includes("kick") && <TabsTrigger value="kick">Manuel</TabsTrigger>}
                    <TabsTrigger value="social">Social</TabsTrigger>
                  </TabsList>
                  <TabsContent value="twitch" className="space-y-3 pt-4">
                    <PreviewField label="Titre Twitch" value={metadata.twitch.title} />
                    <PreviewField label="Catégorie" value={metadata.twitch.category || "—"} />
                    <PushActionRow icon={<Tv className="h-4 w-4" />} connected={twitchConnected} busy={pushingTwitch || saving}
                      disabledReason={!metadata.twitch.title.trim() && !metadata.twitch.category.trim() ? "Ajoute un titre ou une catégorie." : undefined}
                      labelConnected="Mettre à jour Twitch" labelMissing="Connecte Twitch" onPush={handlePushTwitch} />
                    <SkipToggle label="Je préfère configurer Twitch manuellement" checked={skipTwitch} disabled={twitchDone} onChange={setSkipTwitch} />
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
                    <PushActionRow icon={<Video className="h-4 w-4" />} connected={youtubeConnected} busy={pushingYouTube || saving}
                      disabledReason={!metadata.youtube.title.trim() ? "Ajoute un titre pour activer la création du live." : undefined}
                      labelConnected="Créer un live YouTube" labelMissing="Connecte YouTube" onPush={handlePushYouTube} />
                    <SkipToggle label="Je préfère configurer YouTube manuellement" checked={skipYouTube} disabled={youtubeDone} onChange={setSkipYouTube} />
                    <PushHistory entry={youtubePush} platform="youtube" />
                  </TabsContent>
                  <TabsContent value="kick" className="space-y-3 pt-4">
                    <PreviewField label="Titre Kick" value={metadata.kick.title} />
                    <p className="text-xs text-muted-foreground">L'intégration directe n'est pas disponible ici. Copie le titre si tu fais la configuration manuellement.</p>
                  </TabsContent>
                  <TabsContent value="social" className="space-y-3 pt-4">
                    <PreviewField label="Post court" value={metadata.socialSummary} multiline />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>← Précédent</Button>
              <Button onClick={() => setCurrentStep(2)}>Valider le setup OBS →</Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Valider le setup OBS ─── */}
        {currentStep === 2 && (
          <div className="space-y-5">
            {/* OBS checklist */}
            <Card id="live-obs" className="border-border/60">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-start justify-between gap-3">
                  <StepSectionHeader
                    step="03"
                    title="Valide le setup OBS"
                    description="La partie technique doit être rapide à relire."
                    icon={<MonitorPlay className="h-4 w-4 text-primary" />}
                  />
                  <Badge variant="outline" className="shrink-0 text-xs">{obsProgress.done}/{obsProgress.total}</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TechBlock label="Résolution" value={activePreset?.obsTechnical.resolution ?? "1920x1080"} />
                  <TechBlock label="FPS" value={activePreset?.obsTechnical.fps ?? "60 fps"} />
                  <TechBlock label="Bitrate" value={activePreset?.obsTechnical.bitrateKbps ?? "6000 kbps"} />
                  <TechBlock label="Encodeur" value={activePreset?.obsTechnical.encoder ?? "NVENC (recommandé)"} />
                </div>
                {activePreset?.obsTechnical.notes && (
                  <p className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground">{activePreset.obsTechnical.notes}</p>
                )}

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${obsProgress.pct}%` }} />
                </div>

                <div className="flex items-center justify-between gap-2 pb-1">
                  <p className="text-xs font-medium text-muted-foreground">Checklist OBS</p>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary hover:bg-primary/10" onClick={checkAllObs}>
                    Tout cocher
                  </Button>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {obsItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <Checkbox id={`obs-${item.id}`} checked={!!obsChecklist[item.id]}
                        onCheckedChange={(v) => setObsChecklist(prev => ({ ...prev, [item.id]: v === true }))} />
                      <Label htmlFor={`obs-${item.id}`} className={cn("cursor-pointer text-xs leading-tight",
                        obsChecklist[item.id] ? "text-muted-foreground line-through" : "text-foreground")}>
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
                        {activePreset.momentsToPlan.map((m, i) => (<li key={i} className="flex gap-1.5"><span>•</span><span>{m}</span></li>))}
                      </ul>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Film className="h-3.5 w-3.5 text-primary" /> Clips à viser
                      </div>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {activePreset.clipRecommendations.map((c, i) => (<li key={i} className="flex gap-1.5"><span>•</span><span>{c}</span></li>))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* General pre-live checklist */}
            <Card className="border-border/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <StepSectionHeader
                    step="03"
                    title="Checklist générale"
                    description="Les derniers points non techniques avant le départ."
                    icon={<ListChecks className="h-4 w-4 text-primary" />}
                  />
                  <Badge variant="outline" className="shrink-0 text-xs">{preliveProgress.done}/{preliveProgress.total}</Badge>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${preliveProgress.pct}%` }} />
                </div>
                <div className="flex items-center justify-between gap-2 pb-1">
                  <p className="text-xs font-medium text-muted-foreground">Points à valider</p>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary hover:bg-primary/10" onClick={checkAllPrelive}>
                    Tout cocher
                  </Button>
                </div>
                <ul className="space-y-2">
                  {DEFAULT_CHECKLIST_ITEMS.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <Checkbox id={`chk-${item.id}`} checked={!!preliveChecklist[item.id]}
                        onCheckedChange={(v) => setPreliveChecklist(prev => ({ ...prev, [item.id]: v === true }))} />
                      <Label htmlFor={`chk-${item.id}`} className={cn("cursor-pointer text-sm",
                        preliveChecklist[item.id] ? "text-muted-foreground line-through" : "text-foreground")}>
                        {item.label}
                      </Label>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>← Précédent</Button>
              <Button onClick={() => setCurrentStep(3)}>Passer au lancement →</Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Lancement ─── */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <Card id="live-launch" className={cn("border transition", readyToGo.all ? "border-emerald-500/35 bg-emerald-500/[0.04]" : "border-border/60 bg-card/70")}>
              <CardContent className="space-y-4 p-5">
                <StepSectionHeader
                  step="04"
                  title="Plan de lancement"
                  description="Le dernier contrôle avant le live."
                  icon={<Rocket className="h-4 w-4 text-primary" />}
                />
                <ul className="space-y-2 text-sm">
                  <LaunchStep done={readyToGo.titleOk} label="Titre validé"
                    detail={titleConfirmed ? "Le titre est verrouillé." : "Valide le titre final."}
                    action={!titleConfirmed ? <Button size="sm" variant="outline" onClick={() => setCurrentStep(0)}>Ouvrir</Button> : undefined} />
                  <LaunchStep done={readyToGo.twitchOk}
                    label={twitchDone ? "Twitch prêt" : skipTwitch ? "Twitch manuel" : "Configurer Twitch"}
                    detail={twitchDone ? `Titre : ${twitchPush?.title ?? metadata.twitch.title}${twitchPush?.game_name ? ` · ${twitchPush.game_name}` : ""}` : "Pousse les métadonnées Twitch."}
                    action={!readyToGo.twitchOk ? <Button size="sm" variant="outline" onClick={() => setCurrentStep(1)}>Ouvrir</Button> : undefined} />
                  <LaunchStep done={readyToGo.youtubeOk}
                    label={youtubeDone ? "YouTube prêt" : skipYouTube ? "YouTube manuel" : "Créer le live YouTube"}
                    detail={youtubeDone ? `Titre : ${metadata.youtube.title}` : "Crée le brouillon YouTube."}
                    link={youtubePush?.youtube_watch_url ? { href: youtubePush.youtube_watch_url, label: "Ouvrir dans YouTube" } : youtubeDone ? { href: "https://studio.youtube.com/", label: "Ouvrir YouTube Studio" } : undefined}
                    action={!readyToGo.youtubeOk ? <Button size="sm" variant="outline" onClick={() => setCurrentStep(1)}>Ouvrir</Button> : undefined} />
                  <LaunchStep done={readyToGo.obsOk} label={`OBS validé (${obsProgress.done}/${obsProgress.total})`}
                    detail="Termine la checklist technique."
                    action={!readyToGo.obsOk ? <Button size="sm" variant="outline" onClick={() => setCurrentStep(2)}>Ouvrir</Button> : undefined} />
                </ul>
                <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-sm">
                  {readyToGo.all ? (
                    <p className="flex items-start gap-2 text-emerald-300">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <span><strong>Tout est prêt.</strong> Ouvre OBS et lance le direct.</span>
                    </p>
                  ) : (
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span>Un seul but : identifier le prochain blocage avant le départ.</span>
                    </p>
                  )}
                </div>
                <Button className="w-full" disabled={!readyToGo.all || markingReady || isCompleted} onClick={handleMarkReadyToGo}>
                  {markingReady ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Rocket className="mr-1.5 h-4 w-4" />}
                  Marquer comme « prêt à lancer »
                </Button>
                {editingId && !isCompleted && (
                  <Button variant="outline" className="w-full" disabled={endingLive} onClick={handleEndLive}>
                    {endingLive ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <StopCircle className="mr-1.5 h-4 w-4" />}
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

            {existingBrief && (
              <PostLiveBriefCard brief={existingBrief} liveSessionId={editingId} canRegenerate={isCompleted} onRegenerate={handleRegenerateBrief} />
            )}

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>← Précédent</Button>
            </div>
          </div>
        )}

        {/* ── Sessions sauvegardées ────────────────────────────────────── */}
        <div className="mt-8 border-t border-border/40 pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Sessions sauvegardées
              <Badge variant="outline" className="text-xs">{sessions.length}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSessionsOpen(v => !v)}>
              {sessionsOpen ? "Masquer" : "Afficher"}
            </Button>
          </div>
          {sessionsOpen && (loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune session pour l'instant.</p>
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
                  <li key={s.id} className={cn("group flex items-center gap-3 rounded-xl border p-3 transition",
                    editingId === s.id ? "border-primary bg-primary/5" : "border-border/60 hover:border-border")}>
                    <button type="button" onClick={() => loadSession(s)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium text-foreground">{s.title_raw || s.game_category || "Sans titre"}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <StatusPill status={s.status} />
                        {s.game_category && <span>· {s.game_category}</span>}
                        {actions.length > 0 && <span>· {actions.join(" · ")}</span>}
                      </p>
                    </button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </li>
                );
              })}
            </ul>
          ))}
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

function StepSectionHeader({
  step,
  title,
  description,
  icon,
}: {
  step?: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
        {icon}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {step && (
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary/60">
            Étape {step}
          </p>
        )}
        <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function PushActionRow({
  icon, connected, busy, labelConnected, labelMissing, onPush, disabledReason,
}: {
  icon: ReactNode; connected: boolean; busy: boolean;
  labelConnected: string; labelMissing: string; onPush: () => void;
  disabledReason?: string;
}) {
  const disabled = !!disabledReason;
  return (
    <div className="space-y-2">
      {connected ? (
        <Button
          className="w-full gap-2"
          onClick={onPush}
          disabled={busy || disabled}
          title={disabledReason}
        >
          {busy
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : icon}
          {busy ? "Publication en cours…" : labelConnected}
        </Button>
      ) : (
        <Button variant="outline" className="w-full gap-2" asChild>
          <Link to="/reseaux">
            {icon}
            {labelMissing} →
          </Link>
        </Button>
      )}
      {connected && disabled && (
        <p className="text-[11px] text-muted-foreground">{disabledReason}</p>
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
  action?: ReactNode;
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

function PostLiveBriefCard({
  brief, liveSessionId, canRegenerate = false, onRegenerate,
}: {
  brief: PostLiveBrief;
  liveSessionId: string | null;
  canRegenerate?: boolean;
  onRegenerate?: () => Promise<void> | void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  async function handleRegenerate() {
    if (!onRegenerate) return;
    setRegenerating(true);
    try { await onRegenerate(); } finally { setRegenerating(false); }
  }
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
      const VIDEO_PLATFORMS = ["youtube_shorts", "tiktok", "instagram", "twitch_clip"];
      const liveAgeHours = brief.generated_at
        ? Math.max(0, (Date.now() - new Date(brief.generated_at).getTime()) / 3_600_000)
        : null;
      const rows = brief.content_ideas.map((idea) => {
        const pack = buildQualityPackForIdea({
          idea,
          gameCategory: brief.summary.game_category,
          mainAngle: brief.summary.main_angle,
          liveAgeHours,
        });
        return {
          live_session_id: liveSessionId,
          platform: idea.platform,
          title: pack.title,
          description: pack.description || undefined,
          hashtags: pack.hashtags,
          status: (VIDEO_PLATFORMS.includes(idea.platform) ? "to_generate" : "idea") as
            "to_generate" | "idea",
          priority: idea.priority,
          source_idea_id: idea.id,
          format: idea.format,
          duration: idea.duration ?? null,
          reason: idea.reason,
          title_variants: pack.title_variants,
          selected_title_variant: pack.selected_title_variant,
          description_variants: pack.description_variants,
          selected_description_variant: pack.selected_description_variant,
          hashtag_variants: pack.hashtag_variants,
          selected_hashtags: pack.selected_hashtags,
          opportunity_score: pack.opportunity_score,
          opportunity_label: pack.opportunity_label,
          opportunity_reason: pack.opportunity_reason,
        };
      });
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Généré le {generated}</Badge>
            {canRegenerate && onRegenerate && (
              <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating}>
                {regenerating
                  ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  : <Repeat2 className="mr-1.5 h-3.5 w-3.5" />}
                Régénérer
              </Button>
            )}
          </div>
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
