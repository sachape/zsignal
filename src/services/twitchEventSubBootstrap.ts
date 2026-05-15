// Fire-and-forget EventSub subscription bootstrap.
//
// Called once after a successful Twitch OAuth callback. The edge function
// itself is idempotent: it checks for existing local subscriptions per
// (broadcaster_user_id, type, version) and skips creation if status is
// already enabled or webhook_callback_verification_pending.
//
// This call MUST NOT block the OAuth/onboarding flow. Failures are logged
// but never surfaced as a blocking error — the user still reaches the cockpit.
//
// On Growth plan a single user can connect multiple Twitch accounts. When
// known, callers MUST pass `platformUserId` so the backend targets the exact
// newly linked account instead of guessing.
import { supabase } from "@/integrations/supabase/client";

const log = (event: string, payload?: unknown) => {
  // eslint-disable-next-line no-console
  console.log(`[eventsub] ${event}`, payload ?? "");
};

export async function bootstrapTwitchEventSub(
  platformUserId?: string,
): Promise<void> {
  log("eventsub_subscribe_started", platformUserId ? { platformUserId } : undefined);
  try {
    const body: Record<string, string> = {};
    if (platformUserId) body.broadcaster_user_id = platformUserId;
    const { data, error } = await supabase.functions.invoke(
      "twitch-eventsub-subscribe",
      { body },
    );
    if (error) {
      log("eventsub_subscribe_failed", { message: error.message });
      return;
    }
    log("eventsub_subscribe_success", data);
  } catch (err) {
    log("eventsub_subscribe_failed", { error: String(err) });
  }
}
