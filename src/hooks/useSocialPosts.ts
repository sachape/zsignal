import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SocialPlatform = "instagram";
export type SocialFormat = "post" | "reel" | "story";
export type SocialStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export interface SocialPost {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  format: SocialFormat;
  status: SocialStatus;
  caption: string | null;
  hashtags: string[];
  media_storage_path: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  external_platform_id: string | null;
  published_url: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  error_code: string | null;
  error_message: string | null;
  source_content_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NewSocialPost = Partial<
  Omit<SocialPost, "id" | "user_id" | "created_at" | "updated_at">
> & { format: SocialFormat };

const TABLE = "creator_social_posts";

export function useSocialPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from(TABLE)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setPosts((data as SocialPost[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createDraft = useCallback(
    async (payload: NewSocialPost): Promise<SocialPost> => {
      if (!user) throw new Error("Non authentifié");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase as any)
        .from(TABLE)
        .insert({
          ...payload,
          user_id: user.id,
          platform: payload.platform ?? "instagram",
          status: payload.status ?? "draft",
          hashtags: payload.hashtags ?? [],
        })
        .select("*")
        .single();
      if (err) throw new Error(err.message);
      await fetchAll();
      return data as SocialPost;
    },
    [user, fetchAll],
  );

  const updatePost = useCallback(
    async (id: string, patch: Partial<SocialPost>) => {
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any)
        .from(TABLE)
        .update(patch)
        .eq("id", id)
        .eq("user_id", user.id);
      if (err) throw new Error(err.message);
      await fetchAll();
    },
    [user, fetchAll],
  );

  const removePost = useCallback(
    async (id: string) => {
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any)
        .from(TABLE)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (err) throw new Error(err.message);
      await fetchAll();
    },
    [user, fetchAll],
  );

  const uploadMedia = useCallback(
    async (postId: string, file: File): Promise<{ path: string; url: string }> => {
      if (!user) throw new Error("Non authentifié");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${postId}/media.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("creator-social-media")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const { data: signed, error: sErr } = await supabase.storage
        .from("creator-social-media")
        .createSignedUrl(path, 60 * 60 * 24);
      if (sErr) throw new Error(sErr.message);
      return { path, url: signed.signedUrl };
    },
    [user],
  );

  return {
    posts,
    loading,
    error,
    refetch: fetchAll,
    createDraft,
    updatePost,
    removePost,
    uploadMedia,
  };
}
