import { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type {
  ContentPlatform, ContentPriority, NewContentItem,
} from "@/hooks/useContentItems";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (item: NewContentItem) => Promise<number>;
}

const PLATFORM_OPTIONS: { value: ContentPlatform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube_shorts", label: "YouTube (Short ou vidéo)" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitch_clip", label: "Clip Twitch" },
  { value: "community", label: "Communauté / Autre" },
];

const FORMAT_OPTIONS = ["Reel", "Story", "Short", "Post", "Vidéo"];

const PRIORITY_OPTIONS: { value: ContentPriority; label: string }[] = [
  { value: "high", label: "Élevée" },
  { value: "medium", label: "Moyenne" },
  { value: "low", label: "Faible" },
];

export default function NewContentDialog({ open, onOpenChange, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>("instagram");
  const [format, setFormat] = useState<string>("Reel");
  const [description, setDescription] = useState("");
  const [hashtagsRaw, setHashtagsRaw] = useState("");
  const [priority, setPriority] = useState<ContentPriority>("medium");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle(""); setPlatform("instagram"); setFormat("Reel");
    setDescription(""); setHashtagsRaw(""); setPriority("medium");
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Ajoute un titre");
      return;
    }
    setSaving(true);
    try {
      const hashtags = hashtagsRaw
        .split(/[\s,]+/)
        .map(t => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      await onCreate({
        platform,
        title: title.trim(),
        description: description.trim() || null,
        hashtags,
        priority,
        format,
        status: "idea",
      });
      toast.success("Contenu créé");
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Nouveau contenu
          </DialogTitle>
          <DialogDescription>
            Crée un contenu à préparer et publier manuellement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Best of stream du 12/06" maxLength={140} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Plateforme</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as ContentPlatform)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Texte de publication, accroche, contexte…" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Hashtags (séparés par espace)</Label>
            <Input value={hashtagsRaw} onChange={(e) => setHashtagsRaw(e.target.value)}
              placeholder="#gaming #stream #fr" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Priorité</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as ContentPriority)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
            Créer le contenu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
