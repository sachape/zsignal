import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { LiveSetupInput, GeneratedMetadata } from "@/services/liveSetupGenerator";

export type LiveSessionStatus = "draft" | "ready" | "pushed" | "ready_to_go" | "completed";

export interface LiveSession {
  id: string;
  user_id: string;
  title_raw: string;
  game_category: string | null;
  objective: string | null;
  tone: string | null;
  language: string | null;
  target_audience: string | null;
  platforms: string[];
  generated_metadata: GeneratedMetadata | Record<string, never>;
  checklist: Record<string, boolean>;
  status: LiveSessionStatus;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveLiveSessionPayload {
  id?: string;
  input: LiveSetupInput;
  metadata: GeneratedMetadata & Record<string, unknown>;
  checklist: Record<string, boolean>;
  status: LiveSessionStatus;
}

export function useLiveSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from("creator_live_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (err) setError(err.message);
    else setSessions((data as LiveSession[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveSession = useCallback(async (payload: SaveLiveSessionPayload): Promise<LiveSession | null> => {
    if (!user) return null;
    const row = {
      user_id: user.id,
      title_raw: payload.input.titleRaw,
      game_category: payload.input.gameCategory || null,
      objective: payload.input.objective || null,
      tone: payload.input.tone || null,
      language: payload.input.language || null,
      target_audience: payload.input.targetAudience || null,
      platforms: payload.input.platforms,
      generated_metadata: payload.metadata,
      checklist: payload.checklist,
      status: payload.status,
      scheduled_at: payload.input.scheduledAt || null,
    };
    let result;
    if (payload.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await (supabase as any)
        .from("creator_live_sessions")
        .update(row).eq("id", payload.id).eq("user_id", user.id)
        .select().single();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await (supabase as any)
        .from("creator_live_sessions")
        .insert(row).select().single();
    }
    if (result.error) throw new Error(result.error.message);
    await fetchAll();
    return result.data as LiveSession;
  }, [user, fetchAll]);

  const deleteSession = useCallback(async (id: string) => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any)
      .from("creator_live_sessions")
      .delete().eq("id", id).eq("user_id", user.id);
    if (err) throw new Error(err.message);
    await fetchAll();
  }, [user, fetchAll]);

  return { sessions, loading, error, refetch: fetchAll, saveSession, deleteSession };
}
