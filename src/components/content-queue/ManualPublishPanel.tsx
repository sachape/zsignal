import { useState } from "react";
import { toast } from "sonner";
import {
  Copy, Download, ExternalLink, CheckCircle2, Link2, Video, Camera, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContentItem } from "@/hooks/useContentItems";
import { resolveFreshMediaUrl } from "@/services/mediaStorage";
import { normalizeClipTitle } from "@/lib/clipTitle";

interface Props {
  item: ContentItem;
  mediaUrl: string | null;
  onUpdate: (patch: Partial<ContentItem>) => void;
}

function copyText(value: string, label = "Copié") {
  if (!value) {
    toast.error("Rien à copier");
    return;
  }
  navigator.clipboard.writeText(value).then(
    () => toast.success(label),
    () => toast.error("Copie impossible"),
  );
}

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("tiktok.com")) return "tiktok";
  return "other";
}

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  other: "Autre",
};

export default function ManualPublishPanel({ item, mediaUrl, onUpdate }: Props) {
  const [url, setUrl] = useState(item.published_url ?? "");
  const hashtags = (item.selected_hashtags?.length ? item.selected_hashtags : item.hashtags) || [];
  const hashtagsText = hashtags.map(h => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  const fullText = [item.title, item.description ?? "", hashtagsText].filter(Boolean).join("\n\n");

  const isPublished = item.status === "published_manually" || item.status === "published";
  const detectedPlatform = item.published_platform ?? (item.published_url ? detectPlatform(item.published_url) : null);

  async function downloadMedia() {
    // Always try to resolve a fresh signed URL first when the item has a
    // permanent storage pointer — the URL passed in might already be stale.
    const url = (await resolveFreshMediaUrl(item).catch(() => null)) ?? mediaUrl;
    if (!url) {
      toast.error("Aucun média disponible");
      return;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      const ext = (blob.type.split("/")[1] || "mp4").split(";")[0];
      a.href = URL.createObjectURL(blob);
      a.download = `${(item.title || "media").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function handleSubmitUrl() {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Colle d'abord l'URL du post");
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("invalid");
    } catch {
      toast.error("URL invalide");
      return;
    }
    onUpdate({
      published_url: trimmed,
      published_platform: detectPlatform(trimmed),
      published_at: item.published_at ?? new Date().toISOString(),
      status: "published_manually",
    });
    toast.success("Marqué comme publié manuellement");
  }

  function handleMarkPublished() {
    onUpdate({
      status: "published_manually",
      published_at: item.published_at ?? new Date().toISOString(),
      ...(url.trim()
        ? { published_url: url.trim(), published_platform: detectPlatform(url.trim()) }
        : {}),
    });
    toast.success("Marqué comme publié manuellement");
  }

  return (
    <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
        <Send className="h-3.5 w-3.5 text-primary" />
        Publication manuelle
        <span className="ml-auto text-[10px] font-normal text-muted-foreground">
          Publie sur la plateforme, puis colle l'URL ici
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Publication directe bientôt disponible. En attendant, publie manuellement avec les éléments préparés par Streamnco.
      </p>

      {/* Copy actions */}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-[11px]"
          onClick={() => copyText(item.title, "Titre copié")}>
          <Copy className="mr-1 h-3 w-3" /> Titre
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[11px]"
          onClick={() => copyText(item.description ?? "", "Description copiée")}
          disabled={!item.description}>
          <Copy className="mr-1 h-3 w-3" /> Description
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[11px]"
          onClick={() => copyText(hashtagsText, "Hashtags copiés")}
          disabled={hashtags.length === 0}>
          <Copy className="mr-1 h-3 w-3" /> Hashtags
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[11px]"
          onClick={() => copyText(fullText, "Tout copié")}>
          <Copy className="mr-1 h-3 w-3" /> Tout
        </Button>
        {mediaUrl && (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={downloadMedia}>
            <Download className="mr-1 h-3 w-3" /> Télécharger le média
          </Button>
        )}
      </div>

      {/* Open platform */}
      <div className="flex flex-wrap gap-1.5">
        <a href="https://studio.youtube.com/" target="_blank" rel="noreferrer noopener"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] text-foreground hover:border-primary/60">
          <Video className="h-3 w-3" /> Ouvrir YouTube Studio <ExternalLink className="h-2.5 w-2.5" />
        </a>
        <a href="https://www.instagram.com/" target="_blank" rel="noreferrer noopener"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] text-foreground hover:border-primary/60">
          <Camera className="h-3 w-3" /> Ouvrir Instagram <ExternalLink className="h-2.5 w-2.5" />
        </a>
        <a href="https://www.tiktok.com/upload" target="_blank" rel="noreferrer noopener"
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] text-foreground hover:border-primary/60">
          <ExternalLink className="h-3 w-3" /> Ouvrir TikTok
        </a>
      </div>

      {/* URL input */}
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          URL du post publié
        </Label>
        <div className="flex gap-1.5">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/…  ou  https://youtu.be/…"
            className="h-8 text-xs"
          />
          <Button size="sm" className="h-8 text-[11px]" onClick={handleSubmitUrl}>
            <Link2 className="mr-1 h-3 w-3" /> Enregistrer
          </Button>
        </div>
        {!isPublished && (
          <Button
            size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground"
            onClick={handleMarkPublished}>
            <CheckCircle2 className="mr-1 h-3 w-3" /> Marquer comme publié (sans URL)
          </Button>
        )}
      </div>

      {isPublished && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px] text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="font-medium">Publié manuellement</span>
          {detectedPlatform && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5">
              {PLATFORM_LABEL[detectedPlatform] ?? detectedPlatform}
            </span>
          )}
          {item.published_at && (
            <span className="opacity-80">
              le {new Date(item.published_at).toLocaleDateString("fr-FR")}
            </span>
          )}
          {item.published_url && (
            <a href={item.published_url} target="_blank" rel="noreferrer noopener"
              className="ml-auto inline-flex items-center gap-1 underline-offset-2 hover:underline">
              Ouvrir le post <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
