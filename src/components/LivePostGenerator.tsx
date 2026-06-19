import { useState, useMemo } from "react";
import { Copy, Check, RefreshCw, Link as LinkIcon, Gamepad2, Clock, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { LiveSession, LiveDebrief } from "@/services/liveSessions";
import { formatLiveDuration, formatLiveDateTime } from "@/services/liveSessions";
import {
  generatePosts,
  type GeneratedPost,
  type PostFormat,
} from "@/services/postGenerator";

interface Props {
  session: LiveSession;
  debrief: LiveDebrief | null;
  open: boolean;
  onClose: () => void;
}

const LivePostGenerator = ({ session, debrief, open, onClose }: Props) => {
  const posts = useMemo(() => generatePosts(session, debrief), [session, debrief]);
  const [variantIdx, setVariantIdx] = useState<Record<PostFormat, number>>({
    tweet: 0,
    discord: 0,
    tiktok: 0,
    next_live: 0,
  });
  const [copied, setCopied] = useState<PostFormat | null>(null);
  const [clipUrl, setClipUrl] = useState("");

  const currentText = (post: GeneratedPost) => {
    const base = post.variants[variantIdx[post.format] % post.variants.length];
    return clipUrl.trim() ? `${base}\n\n${clipUrl.trim()}` : base;
  };

  const handleCopy = async (post: GeneratedPost) => {
    try {
      await navigator.clipboard.writeText(currentText(post));
      setCopied(post.format);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback: select the textarea
    }
  };

  const handleRegenerate = (format: PostFormat, total: number) => {
    setVariantIdx((prev) => ({
      ...prev,
      [format]: (prev[format] + 1) % total,
    }));
  };

  const charCount = (post: GeneratedPost) =>
    currentText(post).length;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        {/* Header */}
        <SheetHeader className="border-b border-border/50 px-6 py-5">
          <SheetTitle className="text-base">Contenu à publier</SheetTitle>

          {/* Session summary strip */}
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-foreground/[0.06] bg-card/60 px-4 py-3 text-xs">
            {session.category_name && (
              <span className="flex items-center gap-1.5 text-foreground">
                <Gamepad2 className="h-3 w-3 text-primary" />
                {session.category_name}
              </span>
            )}
            {session.duration_minutes != null && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatLiveDuration(session.duration_minutes)}
              </span>
            )}
            {session.peak_viewers != null && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3 w-3" />
                {session.peak_viewers} peak
              </span>
            )}
            <span className="ml-auto text-muted-foreground/60">
              {formatLiveDateTime(session.started_at)}
            </span>
          </div>
        </SheetHeader>

        {/* Clip URL input */}
        <div className="border-b border-border/40 px-6 py-4">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <LinkIcon className="h-3 w-3" />
            Lien clip (facultatif — ajouté à chaque post)
          </label>
          <input
            type="url"
            value={clipUrl}
            onChange={(e) => setClipUrl(e.target.value)}
            placeholder="https://clips.twitch.tv/..."
            className="w-full rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        {/* Post cards */}
        <div className="flex-1 space-y-4 px-6 py-5">
          {posts.map((post) => {
            const text = currentText(post);
            const chars = charCount(post);
            const isOverLimit = post.charLimit != null && chars > post.charLimit;
            const isCopied = copied === post.format;

            return (
              <div
                key={post.format}
                className="overflow-hidden rounded-xl border border-foreground/[0.06] bg-card/40"
              >
                {/* Card header */}
                <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="text-base leading-none">{post.platformEmoji}</span>
                    {post.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {post.charLimit != null && (
                      <span
                        className={`text-[10px] tabular-nums ${
                          isOverLimit
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {chars}/{post.charLimit}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="Autre version"
                      onClick={() => handleRegenerate(post.format, post.variants.length)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant={isCopied ? "default" : "ghost"}
                      size="icon"
                      className={`h-7 w-7 transition-all ${
                        isCopied
                          ? "bg-primary text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => handleCopy(post)}
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Post content */}
                <div className="p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {text}
                  </p>
                  {isOverLimit && (
                    <p className="mt-2 text-[11px] text-destructive">
                      Dépasse la limite de {post.charLimit} caractères — raccourcis avant de publier.
                    </p>
                  )}
                </div>

                {/* Variant indicator */}
                {post.variants.length > 1 && (
                  <div className="flex items-center gap-1 border-t border-border/30 px-4 py-2">
                    {post.variants.map((_, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          setVariantIdx((prev) => ({ ...prev, [post.format]: i }))
                        }
                        className={`h-1.5 rounded-full transition-all ${
                          i === variantIdx[post.format] % post.variants.length
                            ? "w-4 bg-primary"
                            : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                        }`}
                        aria-label={`Version ${i + 1}`}
                      />
                    ))}
                    <span className="ml-auto text-[10px] text-muted-foreground/50">
                      v{(variantIdx[post.format] % post.variants.length) + 1}/
                      {post.variants.length}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="border-t border-border/40 px-6 py-4 text-center text-[11px] text-muted-foreground/60">
          Générés à partir de ton dernier live · modifie avant de publier
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LivePostGenerator;
