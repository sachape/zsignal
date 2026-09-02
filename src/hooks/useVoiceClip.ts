import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VoiceClipSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  keyword: string;
  confidence_threshold: number;
  notifications_enabled: boolean;
  sound_feedback_enabled: boolean;
  cooldown_seconds: number;
  target_duration_seconds: number;
  microphone_label: string | null;
  companion_token: string;
  companion_last_seen_at: string | null;
  companion_version: string | null;
}

export type VoiceClipEventStatus =
  | "detected"
  | "creating"
  | "processing"
  | "ready"
  | "failed";

export interface VoiceClipEvent {
  id: string;
  keyword: string;
  confidence: number | null;
  detected_at: string;
  twitch_clip_id: string | null;
  clip_url: string | null;
  content_item_id: string | null;
  status: VoiceClipEventStatus;
  error_code: string | null;
}

/**
 * Companion liveness. It pings every ~20 s; we consider it offline after 90 s
 * so a crash, a sleep or a network drop surfaces quickly.
 */
export const COMPANION_OFFLINE_AFTER_MS = 90_000;

export function isCompanionOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < COMPANION_OFFLINE_AFTER_MS;
}

/** User-facing French labels. Raw error codes are never displayed. */
export const VOICE_CLIP_ERROR_LABELS: Record<string, string> = {
  STREAM_OFFLINE: "Ton live n'était pas détecté au moment de la commande.",
  TWITCH_SCOPE_MISSING:
    "Streamnco n'a pas encore l'autorisation de créer des clips. Autorise Voice Clip sur Twitch.",
  TWITCH_TOKEN_EXPIRED: "Ta connexion Twitch a expiré. Reconnecte ton compte.",
  TWITCH_REAUTH_REQUIRED: "Reconnecte ton compte Twitch pour continuer.",
  TWITCH_NOT_CONNECTED: "Aucun compte Twitch connecté.",
  TWITCH_CREATE_CLIP_FAILED: "Twitch a refusé la création du clip.",
  TWITCH_CLIP_NOT_READY: "Twitch n'a pas fini de préparer ce clip. Réessaie sur un prochain moment.",
  TWITCH_UNAVAILABLE: "Twitch est momentanément indisponible.",
  CONTENT_QUEUE_INSERT_FAILED: "Le clip a été créé mais n'a pas pu rejoindre ta file de contenu.",
  COMPANION_UNAUTHORIZED: "Le Companion n'est plus appairé à ton compte.",
  VOICE_EVENT_COOLDOWN: "Commande ignorée : trop proche de la précédente.",
  MICROPHONE_UNAVAILABLE: "Microphone indisponible.",
  SERVER_MISCONFIGURED: "Configuration serveur incomplète.",
  UNKNOWN_ERROR: "Le clip n'a pas pu être créé.",
  // Legacy lowercase codes (events created before the QA pass).
  not_live: "Ton live n'était pas détecté au moment de la commande.",
  twitch_auth_expired: "Ta connexion Twitch a expiré. Reconnecte ton compte.",
  twitch_not_connected: "Aucun compte Twitch connecté.",
  missing_scope:
    "Streamnco n'a pas encore l'autorisation de créer des clips. Autorise Voice Clip sur Twitch.",
  twitch_refused: "Twitch a refusé la création du clip.",
  twitch_unavailable: "Twitch est momentanément indisponible.",
  token_unavailable: "Impossible de récupérer ton jeton Twitch.",
  server_misconfigured: "Configuration serveur incomplète.",
};


export function useVoiceClip() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<VoiceClipSettings | null>(null);
  const [events, setEvents] = useState<VoiceClipEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setEvents([]);
      setLoading(false);
      return;
    }
    const [{ data: s }, { data: e }] = await Promise.all([
      supabase.from("voice_clip_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("voice_clip_events")
        .select("id, keyword, confidence, detected_at, twitch_clip_id, clip_url, content_item_id, status, error_code")
        .eq("user_id", user.id)
        .order("detected_at", { ascending: false })
        .limit(30),
    ]);
    setSettings((s as VoiceClipSettings | null) ?? null);
    setEvents((e as VoiceClipEvent[] | null) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Creates the row on first use so the pairing token exists. */
  const ensureSettings = useCallback(async (): Promise<VoiceClipSettings | null> => {
    if (!user) return null;
    if (settings) return settings;
    const { data } = await supabase
      .from("voice_clip_settings")
      .insert({ user_id: user.id } as never)
      .select("*")
      .maybeSingle();
    const created = (data as VoiceClipSettings | null) ?? null;
    if (created) setSettings(created);
    return created;
  }, [settings, user]);

  const updateSettings = useCallback(
    async (patch: Partial<VoiceClipSettings>) => {
      if (!user) return;
      const current = settings ?? (await ensureSettings());
      if (!current) return;
      setSettings({ ...current, ...patch });
      const { data } = await supabase
        .from("voice_clip_settings")
        .update(patch as never)
        .eq("user_id", user.id)
        .select("*")
        .maybeSingle();
      if (data) setSettings(data as VoiceClipSettings);
    },
    [ensureSettings, settings, user],
  );

  return { settings, events, loading, reload: load, ensureSettings, updateSettings };
}
