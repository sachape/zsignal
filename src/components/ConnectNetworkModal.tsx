import { useState, useCallback } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Platform } from "@/types/networks";

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

// ── Config ────────────────────────────────────────────────────────────────────
const PLATFORMS: {
  id: Platform; label: string; color: string; bg: string;
  Icon: React.FC<{ className?: string }>; description: string;
}[] = [
  { id: "twitch",    label: "Twitch",    color: "text-[#9146FF]",  bg: "bg-[#9146FF]/10 border-[#9146FF]/20",  Icon: TwitchIcon,    description: "Ta plateforme principale de streaming live." },
  { id: "youtube",   label: "YouTube",   color: "text-[#FF0000]",  bg: "bg-[#FF0000]/10 border-[#FF0000]/20",  Icon: YouTubeIcon,   description: "Recycle tes lives en VODs et Shorts découvrables." },
  { id: "tiktok",    label: "TikTok",    color: "text-foreground", bg: "bg-muted border-border",               Icon: TikTokIcon,    description: "Canal d'acquisition short-form avec fort reach organique." },
  { id: "instagram", label: "Instagram", color: "text-[#E1306C]",  bg: "bg-[#E1306C]/10 border-[#E1306C]/20", Icon: InstagramIcon, description: "Vitrine créateur et relation communautaire." },
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (platform: Platform, data: { username: string; profile_url: string }) => Promise<void>;
  hasTwitchOAuth?: boolean;
  connectedPlatforms?: Platform[];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ConnectNetworkModal({
  open, onOpenChange, onSave, hasTwitchOAuth = false, connectedPlatforms = [],
}: Props) {
  const [selected, setSelected] = useState<Platform | null>(null);
  const [username, setUsername]  = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [saving, setSaving]     = useState(false);
  const [ytLoading, setYtLoading] = useState(false);
  const [ttLoading, setTtLoading] = useState(false);

  function reset() {
    setSelected(null); setUsername(""); setProfileUrl("");
    setSaving(false); setYtLoading(false); setTtLoading(false);
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleManualSave() {
    if (!selected) return;
    if (!username.trim()) { toast.error("Le nom d'utilisateur est requis."); return; }
    setSaving(true);
    try {
      await onSave(selected, { username: username.trim(), profile_url: profileUrl.trim() });
      toast.success(`${selected.charAt(0).toUpperCase() + selected.slice(1)} ajouté.`);
      handleClose(false);
    } catch {
      toast.error("Une erreur est survenue. Réessaie.");
    } finally { setSaving(false); }
  }

  const handleConnectYouTube = useCallback(async () => {
    setYtLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-auth-start");
      if (error || !data) {
        toast.error("Impossible de contacter le serveur. Réessaie.");
        return;
      }
      if (data.configured === false) {
        toast.error("Connexion YouTube non configurée côté serveur. Contacte le support.");
        return;
      }
      if (!data.url) {
        toast.error("Erreur lors de la génération du lien OAuth.");
        return;
      }
      // Redirect to Google OAuth — the callback edge function handles the rest
      window.location.href = data.url;
    } catch {
      toast.error("Erreur réseau. Réessaie.");
    } finally { setYtLoading(false); }
  }, []);

  const handleConnectTikTok = useCallback(async () => {
    setTtLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-auth-start");
      if (error || !data) {
        toast.error("Impossible de contacter le serveur. Réessaie.");
        return;
      }
      if (data.configured === false) {
        toast.error("Connexion TikTok non configurée côté serveur. Contacte le support.");
        return;
      }
      if (!data.url) {
        toast.error("Erreur lors de la génération du lien OAuth.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Erreur réseau. Réessaie.");
    } finally { setTtLoading(false); }
  }, []);

  const selectedConfig = selected ? PLATFORMS.find((p) => p.id === selected) : null;

  const renderContent = () => {
    if (!selected) return null;

    if (selected === "twitch") {
      return hasTwitchOAuth ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          <span>Twitch est déjà connecté via ton compte Streamnco.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3.5 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            Twitch se connecte depuis{" "}
            <strong className="text-foreground">Paramètres → Compte Twitch</strong>.
          </span>
        </div>
      );
    }

    if (selected === "youtube") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Autorise Streamnco à lire tes données de chaîne YouTube (lecture seule). Tes tokens sont stockés uniquement côté serveur.
          </p>
          <Button
            className="w-full gap-2"
            onClick={handleConnectYouTube}
            disabled={ytLoading}
          >
            {ytLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Connexion en cours…</>
            ) : (
              <><YouTubeIcon className="h-4 w-4" />Connecter YouTube</>
            )}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground/60">
            Tu seras redirigé vers Google pour autoriser l'accès.
          </p>
        </div>
      );
    }

    if (selected === "tiktok") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Autorise Streamnco à lire ton profil TikTok et tes vidéos publiques (lecture seule). Tes tokens sont stockés uniquement côté serveur.
          </p>
          <Button
            className="w-full gap-2"
            onClick={handleConnectTikTok}
            disabled={ttLoading}
          >
            {ttLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Connexion en cours…</>
            ) : (
              <><TikTokIcon className="h-4 w-4" />Connecter TikTok</>
            )}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground/60">
            Tu seras redirigé vers TikTok pour autoriser l'accès.
          </p>
        </div>
      );
    }

    // Instagram — manual entry (intégration API ultérieure)
    const placeholder = { user: "@monpseudo", url: "https://www.instagram.com/monpseudo" };

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ajoute ton {selectedConfig?.label} manuellement. Les insights seront disponibles après connexion Meta.
        </p>
        <div className="space-y-2">
          <Label htmlFor="cn-username">Nom d'utilisateur</Label>
          <Input id="cn-username" placeholder={placeholder.user} value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cn-url">URL du profil <span className="text-muted-foreground">(optionnel)</span></Label>
          <Input id="cn-url" placeholder={placeholder.url} value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} />
        </div>
        <Button className="w-full" onClick={handleManualSave} disabled={saving || !username.trim()}>
          {saving ? "Enregistrement…" : `Ajouter ${selectedConfig?.label}`}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connecter un réseau</DialogTitle>
          <DialogDescription>Choisis une plateforme à ajouter à ton écosystème créateur.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2.5">
          {PLATFORMS.map(({ id, label, color, bg, Icon, description }) => {
            const isConnected = (id === "twitch" && hasTwitchOAuth) || connectedPlatforms.includes(id);
            return (
              <button
                key={id}
                onClick={() => setSelected(selected === id ? null : id)}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all",
                  selected === id ? `${bg} ring-2 ring-primary/50` : "border-border bg-card hover:bg-muted/30",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <Icon className={cn("h-5 w-5", color)} />
                  {isConnected && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
                      Connecté
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-medium">{label}</span>
                <span className="text-[11px] text-muted-foreground leading-snug">{description}</span>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="border-t border-border pt-4">
            {renderContent()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
