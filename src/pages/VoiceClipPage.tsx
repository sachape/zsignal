import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Mic, MicOff, Radio, ShieldCheck, Download, Copy, CheckCircle2,
  AlertTriangle, Loader2, Clapperboard, ExternalLink, Wifi, WifiOff,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/usePageMeta";
import { analytics } from "@/services/analytics";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import {
  useVoiceClip, isCompanionOnline, VOICE_CLIP_ERROR_LABELS,
  type VoiceClipEvent,
} from "@/hooks/useVoiceClip";

const KEYWORD_SUGGESTIONS = ["clip", "sauvegarde", "moment", "highlight"];

const STATUS_LABEL: Record<VoiceClipEvent["status"], string> = {
  detected: "Détecté",
  creating: "Création…",
  processing: "Traitement Twitch",
  ready: "Clip prêt",
  failed: "Échec",
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Minimal typing for the vendor-prefixed Web Speech API. */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const StepCard = ({
  index, title, description, done, children,
}: {
  index: number;
  title: string;
  description: string;
  done?: boolean;
  children?: React.ReactNode;
}) => (
  <Card>
    <CardContent className="flex gap-4 p-6">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
          done
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-muted/40 text-muted-foreground",
        )}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : index}
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </CardContent>
  </Card>
);

const VoiceClipPage = () => {
  usePageMeta({
    title: "Voice Clip — crée tes clips à la voix | Streamnco",
    description:
      "Prononce un mot-clé pendant ton live : Streamnco crée le clip Twitch et l'ajoute à ta file de contenu, sans interrompre ton stream.",
  });

  const { accounts, loading: twitchLoading } = useTwitchConnection();
  const { settings, events, loading, reload, ensureSettings, updateSettings } = useVoiceClip();

  const [pairingOpen, setPairingOpen] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState("clip");
  const [testing, setTesting] = useState(false);
  const [testHeard, setTestHeard] = useState<string | null>(null);
  const [testMatched, setTestMatched] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const twitchConnected = accounts.length > 0;
  const keyword = settings?.keyword ?? "clip";
  const companionOnline = isCompanionOnline(settings?.companion_last_seen_at ?? null);
  const enabled = settings?.enabled ?? false;

  useEffect(() => {
    if (settings?.keyword) setKeywordDraft(settings.keyword);
  }, [settings?.keyword]);

  // Refresh history while the feature is active (a clip can land mid-live).
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => void reload(), 20_000);
    return () => window.clearInterval(id);
  }, [enabled, reload]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const todayEvents = useMemo(() => {
    const today = new Date().toDateString();
    return events.filter((e) => new Date(e.detected_at).toDateString() === today);
  }, [events]);

  const clipsToday = todayEvents.filter((e) => e.status === "ready").length;

  const openPairing = useCallback(async () => {
    const s = await ensureSettings();
    if (!s) {
      toast.error("Impossible de préparer l'appairage du Companion.");
      return;
    }
    analytics.track("voice_clip_companion_pairing_opened");
    setPairingOpen(true);
  }, [ensureSettings]);

  const saveKeyword = useCallback(
    async (value: string) => {
      const normalized = value.trim().toLowerCase().slice(0, 40);
      if (!normalized) {
        toast.error("Choisis un mot-clé.");
        return;
      }
      setKeywordDraft(normalized);
      await updateSettings({ keyword: normalized });
      analytics.track("voice_clip_keyword_set", { keyword: normalized });
      toast.success(`Mot-clé enregistré : « ${normalized} »`);
    },
    [updateSettings],
  );

  // Local microphone test — never creates a clip.
  const startTest = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setTestError(
        "La reconnaissance vocale n'est pas disponible dans ce navigateur. Le test complet se fait depuis le Companion.",
      );
      return;
    }
    setTestError(null);
    setTestHeard(null);
    setTestMatched(false);
    setTesting(true);
    analytics.track("voice_clip_test_started", { keyword: keywordDraft });

    const recognition = new Recognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = String(event.results[0]?.[0]?.transcript ?? "").toLowerCase();
      const matched = transcript.includes(keywordDraft.toLowerCase());
      setTestHeard(transcript);
      setTestMatched(matched);
      analytics.track("voice_clip_test_result", { matched });
    };
    recognition.onerror = (event) => {
      setTestError(
        event.error === "not-allowed"
          ? "Micro indisponible : autorise l'accès au microphone dans ton navigateur."
          : "Le test micro a échoué. Réessaie.",
      );
      setTesting(false);
    };
    recognition.onend = () => setTesting(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [keywordDraft]);

  const toggleEnabled = useCallback(
    async (next: boolean) => {
      if (next && !twitchConnected) {
        toast.error("Connecte d'abord ton compte Twitch.");
        return;
      }
      await updateSettings({ enabled: next });
      analytics.track(next ? "voice_clip_enabled" : "voice_clip_disabled");
      toast.success(next ? "Voice Clip activé." : "Voice Clip désactivé.");
    },
    [twitchConnected, updateSettings],
  );

  const pairingToken = settings?.companion_token ?? "";

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Voice Clip"
          description="Crée tes clips sans interrompre ton live : prononce ton mot-clé, Streamnco s'occupe du reste."
          action={
            enabled ? (
              <Badge className="gap-1.5 bg-primary/15 text-primary hover:bg-primary/15">
                <Radio className="h-3.5 w-3.5" /> Actif
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5">
                <MicOff className="h-3.5 w-3.5" /> Inactif
              </Badge>
            )
          }
        />

        {loading || twitchLoading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <div className="space-y-8">
            {enabled && (
              <Card>
                <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Mot-clé</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">« {keyword} »</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Companion</p>
                    <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-foreground">
                      {companionOnline ? (
                        <><Wifi className="h-4 w-4 text-primary" /> Connecté</>
                      ) : (
                        <><WifiOff className="h-4 w-4 text-muted-foreground" /> Déconnecté</>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Clips créés aujourd'hui</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{clipsToday}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {enabled && !companionOnline && (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Le Companion n'est pas connecté. Tant qu'il ne tourne pas sur ton PC de stream,
                  aucune commande vocale ne sera détectée.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <StepCard
                index={1}
                title="Vérifier la connexion Twitch"
                description="Streamnco crée le clip via l'API Twitch, avec ton autorisation."
                done={twitchConnected}
              >
                {twitchConnected ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Compte connecté : @{accounts[0]?.platform_login ?? "twitch"}
                  </p>
                ) : (
                  <Button asChild size="sm">
                    <Link to="/connect-twitch">Connecter Twitch</Link>
                  </Button>
                )}
              </StepCard>

              <StepCard
                index={2}
                title="Installer le Streamnco Live Companion"
                description="Petite app locale qui écoute ton micro sur ton PC. Aucun flux audio n'est envoyé à Streamnco — seule la détection du mot-clé l'est."
                done={companionOnline}
              >
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={openPairing}>
                    <Download className="mr-2 h-4 w-4" /> Installer et appairer
                  </Button>
                  {companionOnline && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Wifi className="h-4 w-4 text-primary" /> Companion connecté
                    </span>
                  )}
                </div>
              </StepCard>

              <StepCard
                index={3}
                title="Choisir ton mot-clé"
                description="Un mot court, que tu ne dis pas par hasard en live."
                done={Boolean(settings?.keyword)}
              >
                <div className="flex flex-wrap gap-2">
                  {KEYWORD_SUGGESTIONS.map((word) => (
                    <Button
                      key={word}
                      size="sm"
                      variant={keywordDraft === word ? "default" : "outline"}
                      onClick={() => void saveKeyword(word)}
                    >
                      {word}
                    </Button>
                  ))}
                </div>
                <div className="flex max-w-sm items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="voice-keyword">Mot-clé personnalisé</Label>
                    <Input
                      id="voice-keyword"
                      value={keywordDraft}
                      onChange={(e) => setKeywordDraft(e.target.value)}
                      placeholder="clip"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void saveKeyword(keywordDraft)}>
                    Enregistrer
                  </Button>
                </div>
              </StepCard>

              <StepCard
                index={4}
                title="Tester ton micro"
                description="Ce test ne crée aucun clip : il vérifie seulement que ton mot-clé est bien entendu."
                done={testMatched}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="outline" onClick={startTest} disabled={testing}>
                    {testing ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> À toi de parler…</>
                    ) : (
                      <><Mic className="mr-2 h-4 w-4" /> Lancer le test</>
                    )}
                  </Button>
                  {testHeard && (
                    <span className={cn("text-sm", testMatched ? "text-primary" : "text-muted-foreground")}>
                      {testMatched
                        ? `Mot-clé reconnu (« ${testHeard} »)`
                        : `Entendu : « ${testHeard} » — mot-clé non reconnu`}
                    </span>
                  )}
                </div>
                {testError && <p className="text-sm text-muted-foreground">{testError}</p>}
              </StepCard>

              <StepCard
                index={5}
                title="Activer Voice Clip"
                description="Une fois activé, chaque mot-clé prononcé pendant ton live crée un clip Twitch."
                done={enabled}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="voice-enabled"
                      checked={enabled}
                      onCheckedChange={(v) => void toggleEnabled(v)}
                      disabled={!twitchConnected}
                    />
                    <Label htmlFor="voice-enabled">{enabled ? "Voice Clip actif" : "Voice Clip inactif"}</Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      id="voice-notifications"
                      checked={settings?.notifications_enabled ?? true}
                      onCheckedChange={(v) => void updateSettings({ notifications_enabled: v })}
                    />
                    <Label htmlFor="voice-notifications">
                      Notification discrète « Clip sauvegardé » sur le bureau
                    </Label>
                  </div>

                  <div className="max-w-sm space-y-2">
                    <Label>
                      Seuil de confiance : {Math.round((settings?.confidence_threshold ?? 0.75) * 100)} %
                    </Label>
                    <Slider
                      value={[Math.round((settings?.confidence_threshold ?? 0.75) * 100)]}
                      min={50}
                      max={95}
                      step={5}
                      onValueCommit={(v) =>
                        void updateSettings({ confidence_threshold: (v[0] ?? 75) / 100 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Plus le seuil est haut, moins il y a de déclenchements accidentels.
                      Un délai de {settings?.cooldown_seconds ?? 5} s sépare deux clips.
                    </p>
                  </div>
                </div>
              </StepCard>
            </div>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Clips créés à la voix</h2>
              {events.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Aucune commande vocale pour le moment. Les clips créés pendant tes lives
                    apparaîtront ici et dans ta file de contenu.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="divide-y divide-border p-0">
                    {events.map((event) => (
                      <div key={event.id} className="flex flex-wrap items-center gap-3 p-4">
                        <Clapperboard className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            « {event.keyword} » — {formatDate(event.detected_at)} à {formatTime(event.detected_at)}
                          </p>
                          {event.status === "failed" && (
                            <p className="text-xs text-muted-foreground">
                              {VOICE_CLIP_ERROR_LABELS[event.error_code ?? ""] ?? "Le clip n'a pas pu être créé."}
                            </p>
                          )}
                        </div>
                        <Badge variant={event.status === "ready" ? "default" : "outline"}>
                          {STATUS_LABEL[event.status]}
                        </Badge>
                        {event.clip_url && (
                          <Button asChild size="sm" variant="ghost">
                            <a href={event.clip_url} target="_blank" rel="noreferrer">
                              Voir <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              <p className="text-sm text-muted-foreground">
                Chaque clip rejoint automatiquement ta{" "}
                <Link to="/content-queue" className="underline underline-offset-4">
                  file de contenu
                </Link>{" "}
                avec le badge Voice Clip.
              </p>
            </section>
          </div>
        )}

        <Dialog open={pairingOpen} onOpenChange={setPairingOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Appairer le Live Companion</DialogTitle>
              <DialogDescription>
                Installe le Companion sur le PC qui diffuse ton live, puis colle ce code
                d'appairage. Il relie l'app à ton compte Streamnco — garde-le privé.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Code d'appairage</Label>
                <div className="flex gap-2">
                  <Input readOnly value={pairingToken} className="font-mono text-xs" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(pairingToken);
                      toast.success("Code copié.");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>1. Installe le Companion (Windows ou macOS) sur ton PC de stream.</li>
                <li>2. Lance-le et colle le code d'appairage.</li>
                <li>3. Choisis ton micro : la détection reste 100 % locale.</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Le Companion n'envoie jamais ton audio : seule une commande détectée est transmise.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </AppShell>
  );
};

export default VoiceClipPage;
