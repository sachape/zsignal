import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SelectableCard } from "@/components/ui/selectable-card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSocialPublishing, type PublishingPlatform } from "@/hooks/useSocialPublishing";

const PLATFORM_LABEL: Record<PublishingPlatform, string> = {
  youtube: "YouTube Shorts",
  tiktok: "TikTok",
  instagram: "Instagram Reels",
};

interface PublishClipDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contentItemId: string;
  videoUrl?: string | null;
  defaultCaption?: string;
  defaultHashtags?: string[];
  onPublished?: () => void;
}

export default function PublishClipDialog({
  open, onOpenChange, contentItemId, videoUrl,
  defaultCaption = "", defaultHashtags = [], onPublished,
}: PublishClipDialogProps) {
  const { accounts, loading, refresh } = useSocialPublishing();
  const [selected, setSelected] = useState<string[]>([]);
  const [caption, setCaption] = useState(defaultCaption);
  const [hashtagsRaw, setHashtagsRaw] = useState(defaultHashtags.join(" "));
  const [scheduled, setScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasAccounts = accounts.length > 0;
  const canSubmit = !submitting && selected.length > 0 && !!videoUrl;

  const hashtags = useMemo(
    () => hashtagsRaw.split(/\s+/).map((h) => h.replace(/^#/, "")).filter(Boolean),
    [hashtagsRaw],
  );

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        content_item_id: contentItemId,
        account_ids: selected,
        caption,
        hashtags,
      };
      if (scheduled && scheduledAt) {
        payload.scheduled_at = new Date(scheduledAt).toISOString();
      } else {
        payload.publish_now = true;
      }
      const { data, error } = await supabase.functions.invoke<{ status: string }>(
        "zernio-publish-clip",
        { body: payload },
      );
      if (error) throw error;
      toast.success(data?.status === "scheduled" ? "Publication programmée." : "Publication en cours.");
      onPublished?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message ?? "Publication impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Publier le clip</DialogTitle>
          <DialogDescription>Choisis tes réseaux et personnalise la légende.</DialogDescription>
        </DialogHeader>

        {videoUrl && (
          <video
            src={videoUrl}
            controls
            className="aspect-[9/16] max-h-64 w-auto self-center rounded-lg border border-border bg-black"
          />
        )}

        <div className="space-y-3">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Réseaux
          </Label>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des comptes…
            </div>
          ) : !hasAccounts ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm">
              <p className="mb-2 text-muted-foreground">
                Connecte au moins un réseau pour publier ce clip.
              </p>
              <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); window.location.href = "/reseaux"; }}>
                Connecter mes réseaux
              </Button>
            </div>
          ) : (
            <div className="grid gap-2">
              {accounts.map((a) => {
                const active = selected.includes(a.id);
                return (
                  <SelectableCard
                    key={a.id}
                    selected={active}
                    onClick={() => toggle(a.id)}
                    className="flex items-center justify-between px-3 py-2 text-left text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{PLATFORM_LABEL[a.platform]}</span>
                      {a.username && (
                        <span className="text-xs text-muted-foreground">@{a.username}</span>
                      )}
                    </span>
                    {active && <Badge variant="default" className="text-[12px]">Sélectionné</Badge>}
                  </SelectableCard>
                );
              })}
              <Button variant="link" size="sm" onClick={() => void refresh()} className="h-auto self-end p-0 text-xs">
                Rafraîchir
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pc-caption" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Description du post
          </Label>
          <Textarea
            id="pc-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            placeholder="Ex : Le meilleur moment du live d'hier"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pc-tags" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hashtags visibles
          </Label>
          <Input
            id="pc-tags"
            value={hashtagsRaw}
            onChange={(e) => setHashtagsRaw(e.target.value)}
            placeholder="gaming streamer twitch"
          />
          <p className="text-[12px] text-muted-foreground">
            Tape les mots sans #. Le # est ajouté automatiquement à la publication.
          </p>
        </div>

        <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            Aperçu description
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {caption || <span className="text-muted-foreground italic">Ta description apparaîtra ici…</span>}
            {hashtags.length > 0 && (
              <>
                {caption ? "\n\n" : ""}
                <span className="text-primary-strong">{hashtags.map((h) => `#${h}`).join(" ")}</span>
              </>
            )}
          </p>
        </div>


        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <p className="text-sm font-medium">Programmer la publication</p>
            <p className="text-xs text-muted-foreground">Sinon, publiée maintenant.</p>
          </div>
          <Switch checked={scheduled} onCheckedChange={setScheduled} />
        </div>
        {scheduled && (
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {scheduled ? "Programmer" : "Publier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
