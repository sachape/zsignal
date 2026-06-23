import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Send, Plus, ListPlus, Loader2, Check, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useContentItems, type ContentPlatform } from "@/hooks/useContentItems";
import type { LiveSession } from "@/services/liveSessions";

interface Props {
  session: LiveSession;
  /** True when the auto-debrief is partial / missing. Affects copy only. */
  signalLimited: boolean;
}

interface DraftIdea {
  title: string;
  description: string;
  platform: ContentPlatform;
  format: string;
  hashtags: string[];
  reason: string;
}

const PLATFORM_LABEL: Record<ContentPlatform, string> = {
  youtube_shorts: "YouTube Shorts",
  tiktok: "TikTok",
  instagram: "Instagram Reels",
  community: "Post récap",
  twitch_clip: "Clip Twitch",
};

function buildHashtags(category: string | null): string[] {
  const base = ["#stream", "#twitch", "#gaming"];
  if (category) {
    const slug = category
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
    if (slug) base.unshift(`#${slug}`);
  }
  return base.slice(0, 5);
}

function generateDrafts(
  session: LiveSession,
  topic: string,
  moments: string[],
  vodUrl: string,
): DraftIdea[] {
  const category = session.category_name ?? "ton stream";
  const subject = topic.trim() || category;
  const tags = buildHashtags(session.category_name);
  const ideas: DraftIdea[] = [];

  // 1 idea per moment (Short / Reel / TikTok rotation)
  const platforms: ContentPlatform[] = ["youtube_shorts", "instagram", "tiktok"];
  moments
    .map((m) => m.trim())
    .filter(Boolean)
    .forEach((moment, idx) => {
      const platform = platforms[idx % platforms.length];
      ideas.push({
        platform,
        format: "short",
        title: `${moment} — ${subject}`,
        description: `Extrait du live sur ${category}. ${moment}.${vodUrl ? `\n\nVOD : ${vodUrl}` : ""}`,
        hashtags: tags,
        reason: "Moment marquant identifié pendant le live",
      });
    });

  // Always add a recap post
  ideas.push({
    platform: "community",
    format: "recap",
    title: `Récap du live : ${subject}`,
    description: `Petit récap du stream d'aujourd'hui sur ${category}. Merci à tous ceux qui sont passés !${vodUrl ? `\n\nReplay : ${vodUrl}` : ""}`,
    hashtags: tags,
    reason: "Post récap pour ta communauté",
  });

  // Announce next live
  ideas.push({
    platform: "community",
    format: "announce",
    title: "Annonce du prochain live",
    description: `Prochain stream bientôt sur ${category}. Active la notif pour ne rien rater.`,
    hashtags: tags,
    reason: "Maintenir le lien entre deux lives",
  });

  // If no moments provided, still propose a generic short
  if (moments.filter((m) => m.trim()).length === 0) {
    ideas.unshift({
      platform: "youtube_shorts",
      format: "short",
      title: `Meilleur moment du live — ${subject}`,
      description: `À découper depuis la VOD du live sur ${category}.${vodUrl ? `\n\nVOD : ${vodUrl}` : ""}`,
      hashtags: tags,
      reason: "Moment fort à identifier dans la VOD",
    });
  }

  return ideas;
}

const AssistedDebriefPanel = ({ session, signalLimited }: Props) => {
  const { createMany } = useContentItems();
  const [vodUrl, setVodUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [moment1, setMoment1] = useState("");
  const [moment2, setMoment2] = useState("");
  const [moment3, setMoment3] = useState("");
  const [preview, setPreview] = useState<DraftIdea[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const intro = useMemo(() => {
    if (signalLimited) {
      return "L'analyse automatique est limitée sur ce live, mais tu peux quand même préparer des contenus prêts à publier en quelques secondes.";
    }
    return "Transforme ce live en contenus prêts à publier : Streamnco te propose des idées que tu peux envoyer directement dans ta file de contenu.";
  }, [signalLimited]);

  const handleGenerate = () => {
    const moments = [moment1, moment2, moment3];
    const drafts = generateDrafts(session, topic, moments, vodUrl);
    setPreview(drafts);
  };

  const handleSendToQueue = async () => {
    if (!preview || preview.length === 0) return;
    setSubmitting(true);
    try {
      const rows = preview.map((p) => ({
        live_session_id: session.id,
        platform: p.platform,
        title: p.title,
        description: p.description,
        hashtags: p.hashtags,
        status: "idea" as const,
        priority: "medium" as const,
        format: p.format,
        reason: p.reason,
        source_platform: "twitch" as const,
        source_video_url: vodUrl || null,
      }));
      const n = await createMany(rows);
      setCreatedCount(n);
      toast({
        title: "Contenus envoyés dans la file de contenu",
        description: `${n} idée${n > 1 ? "s" : ""} prête${n > 1 ? "s" : ""} à préparer.`,
      });
      setPreview(null);
    } catch (err) {
      toast({
        title: "Impossible d'envoyer les contenus",
        description: err instanceof Error ? err.message : "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mb-4 border-primary/30 bg-primary/[0.03]">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary-strong" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                Débrief assisté — prépare tes contenus
              </p>
              {signalLimited && (
                <Badge variant="muted" className="text-[10px]">
                  Analyse limitée
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{intro}</p>
          </div>
        </div>

        {createdCount > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/[0.06] px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Check className="h-4 w-4 text-success" />
              {createdCount} contenu{createdCount > 1 ? "s" : ""} ajouté{createdCount > 1 ? "s" : ""} à ta file de contenu.
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/content-queue">
                Ouvrir
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}

        {!preview && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="topic" className="text-xs">
                  Sujet principal du live
                </Label>
                <Input
                  id="topic"
                  placeholder={session.category_name ?? "Ex : run no-hit Elden Ring"}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vod" className="text-xs">
                  Lien VOD (optionnel)
                </Label>
                <Input
                  id="vod"
                  placeholder="https://twitch.tv/videos/..."
                  value={vodUrl}
                  onChange={(e) => setVodUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tes 2-3 meilleurs moments</Label>
              <Input
                placeholder="1. Moment drôle, clutch, débat, réaction, annonce…"
                value={moment1}
                onChange={(e) => setMoment1(e.target.value)}
              />
              <Input
                placeholder="2. (optionnel)"
                value={moment2}
                onChange={(e) => setMoment2(e.target.value)}
              />
              <Input
                placeholder="3. (optionnel)"
                value={moment3}
                onChange={(e) => setMoment3(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button onClick={handleGenerate} size="sm">
                <Sparkles className="h-3.5 w-3.5" />
                Générer mes contenus
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/content-queue">
                  <ListPlus className="h-3.5 w-3.5" />
                  Voir la file de contenu
                </Link>
              </Button>
            </div>
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              {preview.length} idée{preview.length > 1 ? "s" : ""} prête{preview.length > 1 ? "s" : ""} à envoyer
            </p>
            <div className="space-y-2">
              {preview.map((p, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/60 bg-card/60 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="muted" className="text-[10px]">
                      {PLATFORM_LABEL[p.platform]}
                    </Badge>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      {p.reason}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-foreground">{p.title}</p>
                  <Textarea
                    className="mt-1.5 min-h-[60px] text-xs"
                    value={p.description}
                    onChange={(e) => {
                      const next = [...preview];
                      next[i] = { ...next[i], description: e.target.value };
                      setPreview(next);
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleSendToQueue} size="sm" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Envoyer dans la file de contenu
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreview(null)}
                disabled={submitting}
              >
                <Plus className="h-3.5 w-3.5" />
                Modifier mes réponses
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssistedDebriefPanel;
