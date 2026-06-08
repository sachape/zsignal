import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, ExternalLink, Pencil, Trash2,
  AlertCircle, CheckCircle2, Clock, Users, PlaySquare, Eye,
  Heart, MessageCircle, Share2,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { useConnectedNetworks } from "@/hooks/useConnectedNetworks";
import { useYouTubeSync } from "@/hooks/useYouTubeSync";
import { useTikTokSync } from "@/hooks/useTikTokSync";
import { supabase } from "@/integrations/supabase/client";
import type { Platform, PlatformMetrics } from "@/types/networks";

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

const PM: Record<Platform, { label: string; color: string; iconBg: string; Icon: React.FC<{ className?: string }> }> = {
  twitch:    { label: "Twitch",    color: "text-[#9146FF]", iconBg: "bg-[#9146FF]/15", Icon: TwitchIcon    },
  youtube:   { label: "YouTube",   color: "text-[#FF0000]", iconBg: "bg-[#FF0000]/10", Icon: YouTubeIcon   },
  tiktok:    { label: "TikTok",    color: "text-foreground", iconBg: "bg-muted",       Icon: TikTokIcon    },
  instagram: { label: "Instagram", color: "text-[#E1306C]", iconBg: "bg-[#E1306C]/10", Icon: InstagramIcon },
};

const VALID_PLATFORMS: Platform[] = ["twitch", "youtube", "tiktok", "instagram"];

function MetricCard({ icon: Icon, label, value }: { icon: React.FC<{ className?: string }>; label: string; value: string | number | null }) {
  return (
    <div className="rounded-xl bg-muted/40 p-4 space-y-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums">
        {value != null ? value.toLocaleString("fr-FR") : <span className="text-sm font-normal text-muted-foreground/50">Non disponible</span>}
      </p>
    </div>
  );
}

function fmt(n: number | null, suffix = ""): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M${suffix}`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k${suffix}`;
  return `${n}${suffix}`;
}

export default function ReseauxPlatformPage() {
  const { platform: platformParam } = useParams<{ platform: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected: hasTwitchOAuth, account: twitchAccount } = useTwitchConnection();
  const { accounts, loading, upsertAccount, removeAccount, refetch } = useConnectedNetworks();

  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const platform = VALID_PLATFORMS.includes(platformParam as Platform)
    ? (platformParam as Platform) : null;

  const meta = platform ? PM[platform] : null;

  const account = useMemo(() => {
    if (platform === "twitch") return null; // handled via useTwitchConnection
    return accounts.find((a) => a.platform === platform) ?? null;
  }, [accounts, platform]);

  const status = useMemo(() => {
    if (!platform) return "disconnected";
    if (platform === "twitch") return hasTwitchOAuth ? "connected" : "disconnected";
    return account?.connection_status ?? "disconnected";
  }, [platform, hasTwitchOAuth, account]);

  const username = platform === "twitch"
    ? twitchAccount?.platform_login
    : account?.username;

  const profileUrl = platform === "twitch"
    ? (twitchAccount ? `https://twitch.tv/${twitchAccount.platform_login}` : null)
    : account?.profile_url;

  const lastSync = account?.last_synced_at ?? null;

  // Load latest metrics snapshot
  useEffect(() => {
    if (!user || !platform || platform === "twitch") { setMetricsLoading(false); return; }
    setMetricsLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("creator_platform_metrics")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", platform)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: PlatformMetrics | null }) => {
        setMetrics(data);
        setMetricsLoading(false);
      });
  }, [user, platform, account?.last_synced_at]);

  const { state: syncState, errorMessage: syncError, sync: syncYouTube } = useYouTubeSync(refetch);
  const { state: ttSyncState, errorMessage: ttSyncError, sync: syncTikTok } = useTikTokSync(refetch);

  const handleReconnectYouTube = async () => {
    const { data } = await supabase.functions.invoke("youtube-auth-start");
    if (data?.url) window.location.href = data.url;
    else toast.error(data?.configured === false ? "YouTube non configuré côté serveur." : "Erreur OAuth.");
  };

  const handleConnectTikTok = async () => {
    const { data } = await supabase.functions.invoke("tiktok-auth-start");
    if (data?.url) window.location.href = data.url;
    else toast.error(data?.configured === false ? "TikTok non configuré côté serveur." : "Erreur OAuth.");
  };

  // Diagnostics
  const diagnostic = useMemo(() => {
    if (!platform) return "";
    if (platform === "twitch") return hasTwitchOAuth
      ? "Twitch est connecté. C'est ton socle live. L'enjeu : transformer ce live en contenu qui dure."
      : "Connecte Twitch via tes paramètres pour centraliser ton cockpit créateur.";
    if (platform === "youtube") {
      if (status !== "connected") return "YouTube n'est pas encore connecté. C'est la priorité n°1 pour recycler tes lives.";
      const recent = metrics?.recent_posts_count;
      return recent == null
        ? "YouTube est connecté. Synchronise pour voir ton activité récente."
        : recent === 0
          ? "Ton YouTube est connecté, mais aucune vidéo publiée ces 30 derniers jours. Priorité : transformer tes meilleurs lives en Shorts ou vidéos longues."
          : `${recent} vidéo${recent > 1 ? "s" : ""} publiée${recent > 1 ? "s" : ""} ces 30 derniers jours. Continue sur cette lancée.`;
    }
    if (platform === "tiktok") {
      if (status === "connected") {
        const recent = metrics?.recent_posts_count;
        return recent == null
          ? "TikTok est connecté. Synchronise pour voir tes vidéos récentes."
          : recent === 0
            ? "Ton TikTok est connecté, mais ton contenu court est sous-exploité. Priorité : publier 2 à 3 vidéos issues de tes meilleurs lives."
            : `${recent} vidéo${recent > 1 ? "s" : ""} TikTok publiée${recent > 1 ? "s" : ""} ces 30 derniers jours. TikTok peut devenir ton canal d'acquisition principal hors live.`;
      }
      return status === "manual"
        ? "TikTok est ajouté manuellement. Connecte-le via OAuth pour récupérer tes vidéos et métriques."
        : "Connecte TikTok pour mesurer si tes lives se transforment en contenu court découvrable.";
    }
    if (platform === "instagram") {
      return status === "manual"
        ? "Instagram est ajouté manuellement. Utilise-le comme vitrine créateur et relais communautaire cohérent avec Twitch."
        : "Ajoute ton profil Instagram pour l'intégrer à ton suivi de présence.";
    }
    return "";
  }, [platform, hasTwitchOAuth, status, metrics]);

  if (!platform || !meta) {
    return (
      <AppShell>
        <PageContainer size="sm">
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <p className="text-muted-foreground">Plateforme inconnue.</p>
            <Button asChild variant="outline"><Link to="/reseaux">Retour aux réseaux</Link></Button>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  const isActive = status === "connected" || status === "manual";

  return (
    <AppShell>
      <PageContainer size="sm">
        {/* ── Back ── */}
        <Button variant="ghost" size="sm" className="mb-4 -ml-1 text-muted-foreground" asChild>
          <Link to="/reseaux"><ArrowLeft className="mr-1.5 h-4 w-4" />Réseaux connectés</Link>
        </Button>

        {/* ── Platform header ── */}
        <div className="mb-6 flex flex-wrap items-start gap-4">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", meta.iconBg)}>
            <meta.Icon className={cn("h-7 w-7", meta.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{meta.label}</h1>
              <span className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                status === "connected" ? "text-primary border-primary/30 bg-primary/5" :
                status === "manual"    ? "text-sky-400 border-sky-400/30 bg-sky-400/5" :
                status === "expired"   ? "text-amber-400 border-amber-400/30 bg-amber-400/5" :
                "text-muted-foreground border-border bg-transparent"
              )}>
                {status === "connected" ? "Connecté" : status === "manual" ? "Ajouté manuellement" : status === "expired" ? "À reconnecter" : "Non connecté"}
              </span>
            </div>
            {username && <p className="text-sm text-muted-foreground mt-0.5">@{username}</p>}
            {profileUrl && (
              <a href={profileUrl} target="_blank" rel="noopener" className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-primary transition-colors">
                {profileUrl.replace(/^https?:\/\//, "").slice(0, 40)}<ExternalLink className="h-3 w-3" />
              </a>
            )}
            {lastSync && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground/50">
                <Clock className="h-3 w-3" />
                Dernière synchro : {new Date(lastSync).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {platform === "youtube" && status === "connected" && (
              <Button size="sm" variant="outline" onClick={syncYouTube} disabled={syncState === "loading"} className="gap-1.5">
                <RefreshCw className={cn("h-3.5 w-3.5", syncState === "loading" && "animate-spin")} />
                {syncState === "loading" ? "Synchro…" : "Synchroniser"}
              </Button>
            )}
            {platform === "youtube" && status === "expired" && (
              <Button size="sm" variant="outline" className="border-amber-400/30 text-amber-400 hover:bg-amber-400/5" onClick={handleReconnectYouTube}>
                Reconnecter
              </Button>
            )}
            {platform === "tiktok" && status === "connected" && (
              <>
                <Button size="sm" variant="outline" onClick={syncTikTok} disabled={ttSyncState === "loading"} className="gap-1.5">
                  <RefreshCw className={cn("h-3.5 w-3.5", ttSyncState === "loading" && "animate-spin")} />
                  {ttSyncState === "loading" ? "Synchro…" : "Synchroniser"}
                </Button>
                <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/5" onClick={async () => {
                  if (!confirm("Déconnecter TikTok ?")) return;
                  await removeAccount("tiktok");
                  toast.success("TikTok déconnecté.");
                  navigate("/reseaux");
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {platform === "tiktok" && status === "expired" && (
              <Button size="sm" variant="outline" className="border-amber-400/30 text-amber-400 hover:bg-amber-400/5" onClick={handleConnectTikTok}>
                Reconnecter
              </Button>
            )}
            {platform === "tiktok" && status === "disconnected" && (
              <Button size="sm" onClick={handleConnectTikTok}>Connecter TikTok</Button>
            )}
            {platform === "instagram" && status === "manual" && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
                  const name = prompt("Nouveau nom d'utilisateur :", username ?? "");
                  if (!name) return;
                  const url = prompt("URL du profil :", profileUrl ?? "");
                  await upsertAccount({ platform, username: name.trim(), profile_url: url?.trim(), connection_status: "manual" });
                  toast.success("Profil mis à jour.");
                }}>
                  <Pencil className="h-3.5 w-3.5" />Modifier
                </Button>
                <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/5" onClick={async () => {
                  if (!confirm(`Supprimer ${meta.label} ?`)) return;
                  await removeAccount(platform);
                  toast.success(`${meta.label} supprimé.`);
                  navigate("/reseaux");
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {platform === "tiktok" && status === "manual" && (
              <>
                <Button size="sm" onClick={handleConnectTikTok} className="gap-1.5">
                  Connecter TikTok
                </Button>
                <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/5" onClick={async () => {
                  if (!confirm(`Supprimer ${meta.label} ?`)) return;
                  await removeAccount(platform);
                  toast.success(`${meta.label} supprimé.`);
                  navigate("/reseaux");
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {platform === "twitch" && !hasTwitchOAuth && (
              <Button size="sm" asChild><Link to="/connect-twitch">Connecter Twitch</Link></Button>
            )}
            {!isActive && platform !== "twitch" && platform !== "tiktok" && (
              <Button size="sm" asChild><Link to="/reseaux">Ajouter</Link></Button>
            )}
          </div>
        </div>

        {(syncError || ttSyncError) && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />{syncError ?? ttSyncError}
          </div>
        )}


        {/* ── Metrics ── */}
        {isActive && (
          <div className="space-y-4 mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Métriques disponibles</p>
            {platform === "twitch" && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Les métriques Twitch (followers, viewers, clips…) sont disponibles dans ton{" "}
                <Link to="/dashboard" className="text-primary hover:underline">Tableau de bord</Link> et ta page{" "}
                <Link to="/analyse" className="text-primary hover:underline">Analyse</Link>.
              </div>
            )}
            {platform !== "twitch" && (
              metricsLoading ? (
                <div className="text-sm text-muted-foreground py-4">Chargement des métriques…</div>
              ) : metrics ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {platform === "youtube" && (
                    <>
                      <MetricCard icon={Users}       label="Abonnés"           value={fmt(metrics.subscribers_count)} />
                      <MetricCard icon={PlaySquare}   label="Vidéos totales"    value={fmt(metrics.videos_count)} />
                      <MetricCard icon={Eye}          label="Vues totales"      value={fmt(metrics.views_count)} />
                      <MetricCard icon={PlaySquare}   label="Vidéos (30 jours)" value={metrics.recent_posts_count} />
                    </>
                  )}
                  {platform === "tiktok" && (
                    <>
                      <MetricCard icon={PlaySquare}    label="Vidéos récupérées"  value={metrics.videos_count} />
                      <MetricCard icon={PlaySquare}    label="Vidéos (30 jours)"  value={metrics.recent_posts_count} />
                      <MetricCard icon={Eye}           label="Vues totales"       value={fmt(metrics.views_count)} />
                      <MetricCard icon={Heart}         label="J'aime"             value={fmt(metrics.likes_count)} />
                      <MetricCard icon={MessageCircle} label="Commentaires"       value={fmt(metrics.comments_count)} />
                      <MetricCard icon={Share2}        label="Partages"           value={fmt(metrics.shares_count)} />
                    </>
                  )}
                  {platform === "instagram" && (
                    <div className="col-span-full rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                      Aucune métrique disponible — l'intégration API Instagram n'est pas encore active.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">
                    {(platform === "youtube" || platform === "tiktok")
                      ? "Aucune donnée synchronisée. Clique sur \"Synchroniser\" pour récupérer tes métriques."
                      : `Aucune métrique disponible — l'intégration API ${meta.label} n'est pas encore active.`}
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* ── Diagnostic ── */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Diagnostic</p>
            <p className="text-sm leading-relaxed">{diagnostic}</p>
            {platform === "tiktok" && status === "manual" && (
              <p className="mt-2 text-[11px] text-muted-foreground/60">
                Connexion API TikTok prévue. Pour l'instant, ce profil est utilisé pour calculer ton score de présence multi-plateforme.
              </p>
            )}
            {platform === "instagram" && status === "manual" && (
              <p className="mt-2 text-[11px] text-muted-foreground/60">
                Les insights Instagram (Reels, Stories) seront disponibles après connexion à l'Instagram Graph API.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Recommendations ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Actions recommandées</p>
          <div className="space-y-2">
            {platform === "youtube" && status === "connected" && !metrics?.recent_posts_count && (
              <div className="rounded-xl border border-border p-3 text-sm">🎬 Publie une première vidéo ou Short depuis tes meilleurs moments live cette semaine.</div>
            )}
            {platform === "youtube" && status !== "connected" && (
              <div className="rounded-xl border border-border p-3 text-sm">
                <strong>Connecter YouTube</strong> — C'est la priorité n°1 pour transformer tes lives en contenu découvrable.
              </div>
            )}
            {platform === "tiktok" && (
              <>
                <div className="rounded-xl border border-border p-3 text-sm">📱 Publie 2 clips TikTok par semaine depuis tes moments forts Twitch.</div>
                <div className="rounded-xl border border-border p-3 text-sm">🔗 Assure-toi que ton lien Twitch est dans ta bio TikTok.</div>
              </>
            )}
            {platform === "instagram" && (
              <>
                <div className="rounded-xl border border-border p-3 text-sm">📸 Harmonise ta photo de profil et ta bio avec Twitch et YouTube.</div>
                <div className="rounded-xl border border-border p-3 text-sm">🔗 Ajoute ton lien Twitch dans ta bio Instagram.</div>
              </>
            )}
            {platform === "twitch" && hasTwitchOAuth && (
              <div className="rounded-xl border border-border p-3 text-sm">
                📊 Consulte ton{" "}
                <Link to="/analyse" className="text-primary hover:underline">rapport d'analyse</Link>{" "}
                pour des recommandations spécifiques à ta chaîne.
              </div>
            )}
          </div>
        </div>

      </PageContainer>
    </AppShell>
  );
}
