// Fire-and-forget EventSub subscription bootstrap.
//
// Called once after a successful Twitch OAuth callback. The edge function
// itself is idempotent: it checks for existing local subscriptions per
// (broadcaster_user_id, type, version) and skips creation if status is
// already enabled or webhook_callback_verification_pending.
//
// This call MUST NOT block the OAuth/onboarding flow. Failures are logged
// but never surfaced as a blocking error — the user still reaches the cockpit.
import { supabase } from "@/integrations/supabase/client";

const log = (event: string, payload?: unknown) => {
  // eslint-disable-next-line no-console
  console.log(`[eventsub] ${event}`, payload ?? "");
};

export async function bootstrapTwitchEventSub(): Promise<void> {
  log("eventsub_subscribe_started");
  try {
    const { data, error } = await supabase.functions.invoke(
      "twitch-eventsub-subscribe",
      { body: {} },
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
