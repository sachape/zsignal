import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Play, Volume2 } from "lucide-react";
import type { SocialFormat } from "@/hooks/useSocialPosts";

interface Props {
  format: SocialFormat;
  caption: string;
  hashtags: string[];
  mediaUrl: string | null;
  mediaMime: string | null;
  username?: string;
  avatarUrl?: string | null;
}

const isVideo = (mime: string | null) => !!mime && mime.startsWith("video");

function MediaBox({ mediaUrl, mediaMime, ratio }: { mediaUrl: string | null; mediaMime: string | null; ratio: string }) {
  if (!mediaUrl) {
    return (
      <div
        className="flex w-full items-center justify-center bg-gradient-to-br from-muted/60 to-muted/30 text-xs text-muted-foreground"
        style={{ aspectRatio: ratio }}
      >
        Aperçu média
      </div>
    );
  }
  if (isVideo(mediaMime)) {
    return (
      <video
        src={mediaUrl}
        className="w-full object-cover bg-black"
        style={{ aspectRatio: ratio }}
        muted
        loop
        playsInline
        autoPlay
      />
    );
  }
  return (
    <img
      src={mediaUrl}
      alt="Aperçu"
      className="w-full object-cover bg-black"
      style={{ aspectRatio: ratio }}
    />
  );
}

function CaptionBlock({ caption, hashtags, username }: { caption: string; hashtags: string[]; username: string }) {
  const tags = hashtags.filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
  if (!caption && !tags) return null;
  return (
    <div className="px-3 py-2 text-sm">
      <span className="font-semibold mr-1.5">{username}</span>
      <span className="text-foreground/90 whitespace-pre-wrap">{caption}</span>
      {tags && <span className="text-primary ml-1.5">{tags}</span>}
    </div>
  );
}

function Header({ username, avatarUrl }: { username: string; avatarUrl?: string | null }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5">
          <div className="h-full w-full rounded-full bg-background overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
          </div>
        </div>
        <span className="text-xs font-semibold">{username}</span>
      </div>
      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function ActionsBar() {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div className="flex items-center gap-3">
        <Heart className="h-5 w-5" />
        <MessageCircle className="h-5 w-5" />
        <Send className="h-5 w-5" />
      </div>
      <Bookmark className="h-5 w-5" />
    </div>
  );
}

const InstagramPreview = ({
  format,
  caption,
  hashtags,
  mediaUrl,
  mediaMime,
  username = "votre_compte",
  avatarUrl,
}: Props) => {
  if (format === "story") {
    return (
      <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-border bg-black shadow-xl">
        <div className="relative" style={{ aspectRatio: "9 / 16" }}>
          <div className="absolute inset-x-2 top-2 z-10 h-0.5 rounded-full bg-white/40">
            <div className="h-full w-1/3 rounded-full bg-white" />
          </div>
          <div className="absolute inset-x-2 top-4 z-10 flex items-center gap-2 text-white text-xs">
            <div className="h-6 w-6 rounded-full bg-white/30 overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <span className="font-semibold drop-shadow">{username}</span>
            <span className="text-white/60">2 min</span>
          </div>
          <div className="absolute inset-0">
            <MediaBox mediaUrl={mediaUrl} mediaMime={mediaMime} ratio="9 / 16" />
          </div>
          {caption && (
            <div className="absolute inset-x-3 bottom-12 z-10 rounded-md bg-black/40 px-2 py-1 text-center text-xs text-white backdrop-blur-sm">
              {caption}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (format === "reel") {
    return (
      <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-border bg-black shadow-xl">
        <div className="relative" style={{ aspectRatio: "9 / 16" }}>
          <div className="absolute inset-0">
            <MediaBox mediaUrl={mediaUrl} mediaMime={mediaMime} ratio="9 / 16" />
          </div>
          <div className="absolute right-2 top-3 z-10 flex items-center gap-1 text-white text-xs">
            <Volume2 className="h-3.5 w-3.5" />
          </div>
          <div className="absolute inset-x-3 bottom-3 z-10 text-white">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded-full bg-white/30 overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <span className="text-xs font-semibold">{username}</span>
            </div>
            {(caption || hashtags.length > 0) && (
              <div className="text-xs leading-snug drop-shadow line-clamp-3">
                {caption}{" "}
                <span className="text-white/90">
                  {hashtags.filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}
                </span>
              </div>
            )}
          </div>
          {!mediaUrl && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <Play className="h-10 w-10 text-white/40" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Post (feed)
  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <Header username={username} avatarUrl={avatarUrl} />
      <MediaBox mediaUrl={mediaUrl} mediaMime={mediaMime} ratio="1 / 1" />
      <ActionsBar />
      <CaptionBlock caption={caption} hashtags={hashtags} username={username} />
      <div className="px-3 pb-3 text-[10px] uppercase tracking-wide text-muted-foreground">À l'instant</div>
    </div>
  );
};

export default InstagramPreview;
