import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus, RefreshCw, Pencil, Trash2, ExternalLink, TrendingUp,
  TrendingDown, Minus, ChevronRight, Info, AlertTriangle,
  Lightbulb, ShieldAlert, Star,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { useConnectedNetworks } from "@/hooks/useConnectedNetworks";
import { useYouTubeSync } from "@/hooks/useYouTubeSync";
import { useTikTokSync } from "@/hooks/useTikTokSync";
import { usePresenceScoreHistory } from "@/hooks/usePresenceScoreHistory";
import { computePresenceScore, getPlatformScore } from "@/services/presenceScore";
import { computeRecommendations, computeDiagnostic } from "@/services/networkRecommendations";
import ConnectNetworkModal from "@/components/ConnectNetworkModal";
import type { Platform } from "@/types/networks";
import { supabase } from "@/integrations/supabase/client";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { useInstagramOAuthStatus } from "@/hooks/useInstagramOAuthStatus";

// ── Platform icons ────────────────────────────────────────────────────────────
function TwitchIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" /></svg>;
}
function YouTubeIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" /></svg>;
}
function TikTokIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.8a8.18 8.18 0 0 0 4.78 1.52V6.88a4.85 4.85 0 0 1-1.01-.19z" /></svg>;
}
function InstagramIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>;
}

// ── Platform meta ─────────────────────────────────────────────────────────────
const PM: Record<Platform, { label: string; color: string; iconBg: string; Icon: React.FC<{ className?: string }>; cta: string }> = {
  twitch:    { label: "Twitch",    color: "text-[#9146FF]", iconBg: "bg-[#9146FF]/15", Icon: TwitchIcon,    cta: "Connecter" },
  youtube:   { label: "YouTube",   color: "text-[#FF0000]", iconBg: "bg-[#FF0000]/10", Icon: YouTubeIcon,   cta: "Connecter YouTube" },
  tiktok:    { label: "TikTok",    color: "text-foreground", iconBg: "bg-muted",       Icon: TikTokIcon,    cta: "Ajouter TikTok" },
  instagram: { label: "Instagram", color: "text-[#E1306C]", iconBg: "bg-[#E1306C]/10", Icon: InstagramIcon, cta: "Ajouter Instagram" },
};

const IMPACT: Record<string, { label: string; cls: string }> = {
  high:   { label: "Impact élevé",  cls: "text-primary border-primary/30 bg-primary/5"         },
  medium: { label: "Impact moyen",  cls: "text-amber-400 border-amber-400/30 bg-amber-400/5"   },
  low:    { label: "Impact faible", cls: "text-muted-foreground border-border bg-muted/30"      },
};

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 42, circ = 2 * Math.PI * r, filled = (score / 100) * circ;
  const color = score >= 81 ? "#89FD3A" : score >= 61 ? "#22c55e" : score >= 31 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="120" height="120" viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(220 14% 16%)" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x="50" y="46" textAnchor="middle" fill="white" fontSize="20" fontWeight="700" fontFamily="DM Sans,sans-serif">{score}</text>
      <text x="50" y="60" textAnchor="middle" fill="hsl(210 20% 55%)" fontSize="9" fontFamily="DM Sans,sans-serif">/100</text>
    </svg>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = ({
    connected:    { label: "Connecté",            cls: "text-primary border-primary/30 bg-primary/5"                  },
    manual:       { label: "Ajouté manuellement", cls: "text-sky-400 border-sky-400/30 bg-sky-400/5"                  },
    expired:      { label: "À reconnecter",       cls: "text-amber-400 border-amber-400/30 bg-amber-400/5"            },
    error:        { label: "Erreur de synchro",   cls: "text-destructive border-destructive/30 bg-destructive/5"      },
    disconnected: { label: "Non connecté",        cls: "text-muted-foreground/50 border-border/40 bg-transparent"     },
  } as Record<string, { label: string; cls: string }>)[status] ?? { label: status, cls: "text-muted-foreground border-border bg-muted/30" };
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", c.cls)}>{c.label}</span>;
}

// ── Edit platform dialog ──────────────────────────────────────────────────────
function EditPlatformDialog({
  platform, username: initUsername, profileUrl: initUrl,
  open, onOpenChange, onSave, onDelete,
}: {
  platform: Platform; username: string; profileUrl: string;
  open: boolean; onOpenChange: (v: boolean) => void;
  onSave: (username: string, profileUrl: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [username, setUsername] = useState(initUsername);
  const [profileUrl, setProfileUrl] = useState(initUrl);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = PM[platform];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("flex h-6 w-6 items-center justify-center rounded", meta.iconBg)}>
              <meta.Icon className={cn("h-3.5 w-3.5", meta.color)} />
            </div>
            Modifier {meta.label}
          </DialogTitle>
          <DialogDescription>Met à jour ton profil {meta.label}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom d'utilisateur</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@monpseudo" />
          </div>
          <div className="space-y-1.5">
            <Label>URL du profil</Label>
            <Input value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {confirmDelete ? (
            <>
              <p className="text-xs text-destructive flex-1">Confirme la suppression.</p>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
              <Button variant="destructive" size="sm" disabled={deleting} onClick={async () => {
                setDeleting(true);
                try { await onDelete(); onOpenChange(false); }
                finally { setDeleting(false); }
              }}>{deleting ? "Suppression…" : "Confirmer"}</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />Supprimer
              </Button>
              <Button size="sm" disabled={saving || !username.trim()} onClick={async () => {
                setSaving(true);
                try { await onSave(username.trim(), profileUrl.trim()); onOpenChange(false); }
                finally { setSaving(false); }
              }}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Platform card ─────────────────────────────────────────────────────────────
function PlatformCard({
  platform, status, username, platformScore, lastSyncedAt,
  onConnect, onEdit, onSync, syncLoading, onReconnect,
}: {
  platform: Platform; status: string; username?: string | null;
  platformScore: number; lastSyncedAt?: string | null;
  onConnect: () => void; onEdit?: () => void;
  onSync?: () => void; syncLoading?: boolean;
  onReconnect?: () => void;
}) {
  const meta = PM[platform];
  const isActive = status === "connected" || status === "manual";
  const isExpired = status === "expired";
  const scoreColor = platformScore >= 70 ? "text-primary" : platformScore >= 40 ? "text-amber-400" : "text-muted-foreground";

  const syncLabel = lastSyncedAt
    ? `Synchro ${new Date(lastSyncedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`
    : "Jamais synchronisé";

  return (
    <Card className={cn("flex flex-col transition-all", isActive ? "" : "opacity-70 hover:opacity-100")}>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", meta.iconBg)}>
            <meta.Icon className={cn("h-4.5 w-4.5", meta.color)} />
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Identity */}
        <div>
          <p className="font-semibold text-sm">{meta.label}</p>
          <p className="text-xs text-muted-foreground">
            {username ? `@${username}` : isActive ? "Profil non renseigné" : "Non connecté"}
          </p>
          {status === "manual" && (
            <p className="mt-1 text-[10px] text-muted-foreground/60 leading-snug">
              {platform === "tiktok"
                ? "Ajouté manuellement. Connecte TikTok via OAuth pour récupérer tes vidéos."
                : "Utilisé comme vitrine créateur. Insights disponibles après connexion Meta."}
            </p>
          )}
          {isActive && lastSyncedAt !== undefined && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/50">{syncLabel}</p>
          )}
        </div>

        {/* Score */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/40 mt-auto">
          <span className="text-[11px] text-muted-foreground">Score plateforme</span>
          <span className={cn("text-sm font-bold tabular-nums", isActive ? scoreColor : "text-muted-foreground/30")}>
            {isActive ? `${platformScore}/100` : "—"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isExpired ? (
            <Button size="sm" variant="outline" className="flex-1 text-xs h-7 border-amber-400/30 text-amber-400 hover:bg-amber-400/5" onClick={onReconnect}>
              Reconnecter
            </Button>
          ) : isActive ? (
            <>
              {(platform === "youtube" || platform === "tiktok") && onSync && status === "connected" && (
                <Button size="sm" variant="outline" className="flex-1 text-xs h-7" disabled={syncLoading} onClick={onSync}>
                  <RefreshCw className={cn("mr-1 h-3 w-3", syncLoading && "animate-spin")} />
                  {syncLoading ? "Synchro…" : "Synchroniser"}
                </Button>
              )}
              {((platform === "tiktok" && status === "manual") || platform === "instagram") && onEdit && (
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={onEdit}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" asChild>
                <Link to={`/reseaux/${platform}`}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          ) : (
            <Button size="sm" className="flex-1 text-xs h-7" onClick={onConnect}>{meta.cta}</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Score history mini ────────────────────────────────────────────────────────
function ScoreHistoryMini({ history }: { history: { score: number; snapshot_date: string }[] }) {
  if (history.length < 2) return null;
  const current = history[0].score;
  const previous = history[1].score;
  const delta = current - previous;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendCls = delta > 0 ? "text-primary" : delta < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-2">
      <TrendIcon className={cn("h-4 w-4", trendCls)} />
      <span className={cn("text-sm font-medium tabular-nums", trendCls)}>
        {delta > 0 ? "+" : ""}{delta} pts
      </span>
      <span className="text-xs text-muted-foreground">vs session précédente</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReseauxPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isConnected: hasTwitchOAuth, account: twitchAccount } = useTwitchConnection();
  const { accounts, loading, upsertAccount, removeAccount, refetch } = useConnectedNetworks();
  const { history, saveSnapshot } = usePresenceScoreHistory();
  const { connection: metaConnection, refetch: refetchMeta } = useInstagramConnection();
  const { oauth_enabled: igOAuthEnabled } = useInstagramOAuthStatus();
  const [igActionLoading, setIgActionLoading] = useState(false);
  const [ignoredInstagramError, setIgnoredInstagramError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<{ platform: Platform; username: string; profileUrl: string } | null>(null);

  const { state: syncState, errorMessage: syncError, sync: syncYouTube } = useYouTubeSync(refetch);
  const { state: ttSyncState, errorMessage: ttSyncError, sync: syncTikTok } = useTikTokSync(refetch);

  // Handle OAuth result from URL
  useEffect(() => {
    const ytResult = searchParams.get("youtube");
    const ttResult = searchParams.get("tiktok");
    const igResult = searchParams.get("instagram");
    if (!ytResult && !ttResult && !igResult) return;
    if (ytResult === "connected") { toast.success("YouTube connecté avec succès !"); refetch(); }
    else if (ytResult === "cancelled") { toast.info("Connexion YouTube annulée."); }
    else if (ytResult === "error") {
      const reason = searchParams.get("reason") ?? "inconnue";
      toast.error(`Erreur de connexion YouTube (${reason}).`);
    }
    if (ttResult === "connected") { toast.success("TikTok connecté avec succès !"); refetch(); }
    else if (ttResult === "cancelled") { toast.info("Connexion TikTok annulée."); }
    else if (ttResult === "error") {
      const reason = searchParams.get("reason") ?? "inconnue";
      toast.error(`Erreur de connexion TikTok (${reason}).`);
    }
    if (igResult === "connected") { toast.success("Instagram connecté avec succès !"); setIgnoredInstagramError(null); refetchMeta(); }
    else if (igResult === "cancelled") { toast.info("Connexion Instagram annulée."); }
    else if (igResult === "error") {
      const reason = searchParams.get("reason") ?? "inconnue";
      const step = searchParams.get("step");
      const metaError = searchParams.get("meta_error");
      const callbackVersion = searchParams.get("callback_version");
      if (callbackVersion) console.debug("instagram callback version", callbackVersion);
      setIgnoredInstagramError(metaConnection?.error_message ?? null);
      const msg = reason === "ig_account_not_professional"
        ? "Compte Instagram professionnel (Business ou Creator) requis."
        : reason === "instagram_oauth_disabled"
          ? "Connexion Meta non encore activée."
          : reason === "meta_not_configured"
            ? "Connexion Meta non configurée."
            : metaError
              ? `Erreur Instagram (${step ?? reason}) : ${metaError}`
              : `Erreur de connexion Instagram (${reason}${step ? ` · ${step}` : ""}).`;
      toast.error(msg);
      refetchMeta();
    }
    setSearchParams((p) => {
      p.delete("youtube"); p.delete("tiktok"); p.delete("instagram"); p.delete("reason");
      p.delete("step"); p.delete("meta_error"); p.delete("callback_version");
      return p;
    }, { replace: true });
  }, [searchParams, setSearchParams, refetch, refetchMeta, metaConnection?.error_message]);

  // Save presence snapshot when accounts or Twitch connection change
  useEffect(() => {
    if (!loading) saveSnapshot(accounts, hasTwitchOAuth);
  }, [accounts, hasTwitchOAuth, loading]);  // eslint-disable-line react-hooks/exhaustive-deps

  const scoreResult = useMemo(() => computePresenceScore(accounts, hasTwitchOAuth), [accounts, hasTwitchOAuth]);
  const recommendations = useMemo(() => computeRecommendations(accounts, hasTwitchOAuth), [accounts, hasTwitchOAuth]);
  const diagnostic = useMemo(() => computeDiagnostic(accounts, hasTwitchOAuth), [accounts, hasTwitchOAuth]);
  const connectedPlatforms = useMemo<Platform[]>(
    () => accounts.filter((a) => a.connection_status === "connected" || a.connection_status === "manual").map((a) => a.platform),
    [accounts],
  );

  const getPlatformStatus = (platform: Platform): string => {
    if (platform === "twitch") return hasTwitchOAuth ? "connected" : "disconnected";
    return accounts.find((a) => a.platform === platform)?.connection_status ?? "disconnected";
  };
  const getPlatformUsername = (platform: Platform): string | null => {
    if (platform === "twitch") return twitchAccount?.platform_login ?? null;
    return accounts.find((a) => a.platform === platform)?.username ?? null;
  };
  const getPlatformLastSync = (platform: Platform): string | null => {
    if (platform === "twitch") return null;
    return accounts.find((a) => a.platform === platform)?.last_synced_at ?? null;
  };

  const handleSave = async (platform: Platform, data: { username: string; profile_url: string }) => {
    await upsertAccount({ platform, username: data.username, profile_url: data.profile_url || undefined, connection_status: "manual" });
  };

  const handleReconnectYouTube = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("youtube-auth-start");
    if (error || !data?.url) {
      toast.error(data?.configured === false ? "Connexion YouTube non configurée côté serveur." : "Erreur lors de l'initialisation OAuth.");
      return;
    }
    window.location.href = data.url;
  }, []);

  const handleReconnectTikTok = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("tiktok-auth-start");
    if (error || !data?.url) {
      toast.error(data?.configured === false ? "Connexion TikTok non configurée côté serveur." : "Erreur lors de l'initialisation OAuth.");
      return;
    }
    window.location.href = data.url;
  }, []);

  const handleConnectInstagram = useCallback(async () => {
    setIgActionLoading(true);
    try {
      setIgnoredInstagramError(null);
      if (user) {
        await supabase
          .from("creator_meta_connections")
          .update({
            connection_status: "pending_review",
            error_code: null,
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("platform", "instagram");
        await refetchMeta();
      }
      const { data, error } = await supabase.functions.invoke("instagram-auth-start");
      const url = (data as { authorize_url?: string } | null)?.authorize_url;
      if (error || !url) {
        const code = (data as { error?: string } | null)?.error;
        const msg = code === "instagram_oauth_disabled"
          ? "Connexion Meta non encore activée."
          : code === "meta_not_configured"
            ? "Connexion Meta non configurée."
            : "Erreur lors de l'initialisation OAuth Instagram.";
        toast.error(msg);
        return;
      }
      window.location.href = url;
    } finally {
      setIgActionLoading(false);
    }
  }, [refetchMeta, user]);

  const handleDisconnectInstagram = useCallback(async () => {
    setIgActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke("instagram-disconnect");
      if (error) { toast.error("Échec de la déconnexion Instagram."); return; }
      toast.success("Instagram déconnecté.");
      await refetchMeta();
    } finally {
      setIgActionLoading(false);
    }
  }, [refetchMeta]);

  const PLATFORMS: Platform[] = ["twitch", "youtube", "tiktok", "instagram"];

  if (!user) return null;

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Créateur"
          title="Réseaux connectés"
          description="Ton live ne doit pas mourir après Twitch. Connecte tes plateformes et vois si ton contenu se transforme vraiment en croissance."
          action={
            <Button onClick={() => setModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Connecter un réseau
            </Button>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <div className="space-y-6">

            {/* ── Creator Presence Score ── */}
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="mx-auto sm:mx-0 shrink-0">
                    <ScoreRing score={scoreResult.total} />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">Creator Presence Score</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold">{scoreResult.statusLabel}</h2>
                        <ScoreHistoryMini history={history} />
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{scoreResult.diagnosis}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {([
                        { label: "Présence",       pts: scoreResult.presencePoints,        max: 35 },
                        { label: "Activité",        pts: scoreResult.activityPoints,        max: 25 },
                        { label: "Diversification", pts: scoreResult.diversificationPoints, max: 20 },
                        { label: "Cohérence",       pts: scoreResult.consistencyPoints,     max: 20 },
                      ] as const).map(({ label, pts, max }) => (
                        <div key={label} className="rounded-lg bg-muted/40 px-2.5 py-2 text-center">
                          <p className="text-[10px] text-muted-foreground/70 mb-0.5">{label}</p>
                          <p className="text-sm font-bold tabular-nums">{pts}<span className="text-[10px] font-normal text-muted-foreground">/{max}</span></p>
                        </div>
                      ))}
                    </div>
                    {history.length > 0 && (
                      <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                        <Info className="h-3 w-3 shrink-0" />
                        {history.length} snapshot{history.length > 1 ? "s" : ""} enregistré{history.length > 1 ? "s" : ""}
                        {history.length === 1 && " · L'historique apparaîtra après plusieurs synchronisations."}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Platform grid ── */}
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Tes plateformes</p>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {PLATFORMS.map((platform) => (
                  <PlatformCard
                    key={platform}
                    platform={platform}
                    status={getPlatformStatus(platform)}
                    username={getPlatformUsername(platform)}
                    platformScore={getPlatformScore(platform, accounts, hasTwitchOAuth)}
                    lastSyncedAt={getPlatformLastSync(platform)}
                    onConnect={() => setModalOpen(true)}
                    onEdit={platform === "tiktok" || platform === "instagram" ? () => {
                      const acc = accounts.find((a) => a.platform === platform);
                      setEditDialog({ platform, username: acc?.username ?? "", profileUrl: acc?.profile_url ?? "" });
                    } : undefined}
                    onSync={
                      platform === "youtube"
                        ? async () => { await syncYouTube(); if (syncState === "success") refetch(); }
                        : platform === "tiktok"
                          ? async () => { await syncTikTok(); if (ttSyncState === "success") refetch(); }
                          : undefined
                    }
                    syncLoading={
                      (platform === "youtube" && syncState === "loading") ||
                      (platform === "tiktok" && ttSyncState === "loading")
                    }
                    onReconnect={
                      platform === "youtube" ? handleReconnectYouTube
                        : platform === "tiktok" ? handleReconnectTikTok
                        : undefined
                    }
                  />
                ))}
              </div>
              {syncError && <p className="mt-2 text-xs text-destructive">YouTube : {syncError}</p>}
              {ttSyncError && <p className="mt-2 text-xs text-destructive">TikTok : {ttSyncError}</p>}

              {/* ── Instagram / Meta integration status (honest) ── */}
              <div className="mt-3 rounded-lg border border-border bg-card/40 p-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <InstagramIcon className="h-4 w-4 mt-0.5 shrink-0 text-[#E1306C]" />
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold text-foreground">Instagram — intégration officielle Meta</p>
                      {(() => {
                        if (metaConnection?.connection_status === "connected") {
                          return (
                            <p className="text-muted-foreground">
                              Connecté en tant que <span className="text-foreground">@{metaConnection.instagram_username}</span>
                              {metaConnection.account_type ? ` · ${metaConnection.account_type}` : ""}.
                              <span className="block mt-0.5 text-muted-foreground/70">
                                Publication Instagram en attente de validation Meta — l'envoi sera activé une fois l'App Review approuvée.
                              </span>
                            </p>
                          );
                        }
                        if (!igOAuthEnabled) {
                          return (
                            <p className="text-muted-foreground">
                              Connexion Meta en préparation. La publication officielle Post / Reel / Story
                              arrivera après validation de notre App Meta. Ajouter Instagram manuellement
                              sert uniquement à compléter ton profil — ce n'est pas suffisant pour publier.
                            </p>
                          );
                        }
                        if (metaConnection?.connection_status === "pending_review") {
                          return <p className="text-amber-300/90">Connexion Meta en cours de validation.</p>;
                        }
                        const currentInstagramError = metaConnection?.error_message === ignoredInstagramError
                          ? null
                          : metaConnection?.error_message;
                        if (metaConnection?.connection_status === "error" && currentInstagramError) {
                          return (
                            <p className="text-destructive/90">
                              {currentInstagramError}
                            </p>
                          );
                        }
                        return (
                          <p className="text-muted-foreground">
                            Streamnco utilise la connexion officielle Instagram. Un compte Instagram
                            professionnel <span className="text-foreground">Business ou Creator</span> est nécessaire.
                            Aucune Page Facebook requise.
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  {igOAuthEnabled && (
                    <div className="shrink-0">
                      {metaConnection?.connection_status === "connected" ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          disabled={igActionLoading} onClick={handleDisconnectInstagram}>
                          Déconnecter
                        </Button>
                      ) : (
                        <Button size="sm" className="h-7 text-xs"
                          disabled={igActionLoading} onClick={handleConnectInstagram}>
                          {igActionLoading ? "…" : metaConnection?.connection_status === "error" ? "Réessayer" : "Connecter Instagram"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Diagnostic ── */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="font-semibold text-sm">Diagnostic multi-plateforme</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {[
                    { icon: Star,         color: "text-primary",           bg: "bg-primary/5 border-primary/10",           label: "Point fort",            text: diagnostic.strongPoint       },
                    { icon: AlertTriangle, color: "text-amber-400",         bg: "bg-amber-400/5 border-amber-400/10",       label: "Point faible",          text: diagnostic.weakPoint         },
                    { icon: ShieldAlert,  color: "text-destructive",        bg: "bg-destructive/5 border-destructive/10",   label: "Risque principal",      text: diagnostic.mainRisk          },
                    { icon: Lightbulb,    color: "text-sky-400",            bg: "bg-sky-400/5 border-sky-400/10",           label: "Opportunité principale", text: diagnostic.mainOpportunity   },
                  ].map(({ icon: Icon, color, bg, label, text }) => (
                    <div key={label} className={cn("flex gap-2.5 rounded-lg border p-3", bg)}>
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", color)} />
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-sm leading-snug">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {diagnostic.priorityPlatform && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border px-3 py-2">
                    <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm">
                      <span className="font-medium">Plateforme prioritaire :</span>{" "}
                      <span className="capitalize text-primary">{PM[diagnostic.priorityPlatform].label}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Recommendations ── */}
            {recommendations.length > 0 && (
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Actions recommandées</p>
                <div className="space-y-2">
                  {recommendations.map((rec, i) => {
                    const imp  = IMPACT[rec.impact];
                    const meta = rec.platform !== "all" ? PM[rec.platform as Platform] : null;
                    return (
                      <Card key={i} className="border-border/50">
                        <CardContent className="flex items-start gap-3 p-4">
                          {meta && (
                            <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", meta.iconBg)}>
                              <meta.Icon className={cn("h-3.5 w-3.5", meta.color)} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold">{rec.title}</p>
                              <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium", imp.cls)}>{imp.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                          </div>
                          <Button variant="outline" size="sm" className="shrink-0 text-xs h-7 px-2.5" onClick={() => setModalOpen(true)}>
                            {rec.actionLabel}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Empty state ── */}
            {connectedPlatforms.length === 0 && !hasTwitchOAuth && (
              <Card className="border-dashed border-border/40">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Aucun réseau connecté</p>
                    <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                      Connecte au moins une plateforme pour calculer ton Creator Presence Score et recevoir tes premières recommandations.
                    </p>
                  </div>
                  <Button onClick={() => setModalOpen(true)} className="mt-1 gap-2">
                    <Plus className="h-4 w-4" />Connecter un réseau
                  </Button>
                </CardContent>
              </Card>
            )}

          </div>
        )}

        {/* ── Modals ── */}
        <ConnectNetworkModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSave={handleSave}
          hasTwitchOAuth={hasTwitchOAuth}
          connectedPlatforms={connectedPlatforms}
        />

        {editDialog && (
          <EditPlatformDialog
            platform={editDialog.platform}
            username={editDialog.username}
            profileUrl={editDialog.profileUrl}
            open={!!editDialog}
            onOpenChange={(v) => { if (!v) setEditDialog(null); }}
            onSave={async (username, profileUrl) => {
              await upsertAccount({ platform: editDialog.platform, username, profile_url: profileUrl, connection_status: "manual" });
              toast.success(`${PM[editDialog.platform].label} mis à jour.`);
            }}
            onDelete={async () => {
              await removeAccount(editDialog.platform);
              toast.success(`${PM[editDialog.platform].label} supprimé.`);
            }}
          />
        )}
      </PageContainer>
    </AppShell>
  );
}
