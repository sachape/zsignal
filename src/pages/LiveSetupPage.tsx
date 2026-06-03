import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Rocket, Save, Sparkles, Twitch, Youtube, Music2, Instagram,
  CheckCircle2, Copy, Trash2, Clock, ChevronRight, ListChecks, Wand2,
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
import { useConnectedNetworks } from "@/hooks/useConnectedNetworks";
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
  { value: "twitch", label: "Twitch", Icon: Twitch },
  { value: "youtube", label: "YouTube", Icon: Youtube },
  { value: "tiktok", label: "TikTok Live", Icon: Music2, soon: true },
  { value: "instagram", label: "Instagram Live", Icon: Instagram, soon: true },
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
  const { sessions, loading, saveSession, deleteSession } = useLiveSessions();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [input, setInput] = useState<LiveSetupInput>(EMPTY_INPUT);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(EMPTY_CHECKLIST);
  const [metadata, setMetadata] = useState<GeneratedMetadata>(() => generateMetadata(EMPTY_INPUT));
  const [saving, setSaving] = useState(false);

  const twitchConnected = useMemo(
    () => accounts.some(a => a.platform === "twitch" && a.connection_status === "connected"),
    [accounts],
  );
  const youtubeConnected = useMemo(
    () => accounts.some(a => a.platform === "youtube" && a.connection_status === "connected"),
    [accounts],
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
                    <PlatformActionRow
                      icon={<Twitch className="h-4 w-4" />}
                      label={twitchConnected ? "Mettre à jour Twitch" : "Connexion Twitch requise"}
                      connected={twitchConnected}
                      onClick={() => toast.info("L'update Twitch arrive dans une prochaine version.")}
                    />
                  </TabsContent>

                  <TabsContent value="youtube" className="space-y-3 pt-4">
                    <PreviewField label="Titre YouTube" value={metadata.youtube.title} />
                    <PreviewField label="Description" value={metadata.youtube.description} multiline />
                    <PreviewField
                      label="Tags"
                      value={metadata.youtube.tags.join(", ") || "—"}
                    />
                    <PlatformActionRow
                      icon={<Youtube className="h-4 w-4" />}
                      label={youtubeConnected ? "Créer un live YouTube" : "Connexion YouTube requise"}
                      connected={youtubeConnected}
                      onClick={() => toast.info("La création de live YouTube arrive dans une prochaine version.")}
                    />
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

function PlatformActionRow({
  icon, label, connected, onClick,
}: { icon: React.ReactNode; label: string; connected: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      {connected ? (
        <Button size="sm" variant="outline" onClick={onClick}>
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-primary" />
          Préparer
        </Button>
      ) : (
        <Button size="sm" variant="ghost" asChild>
          <Link to="/reseaux">Connecter</Link>
        </Button>
      )}
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
