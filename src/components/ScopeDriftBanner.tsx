import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  broadcasterUserId: string | null;
}

/**
 * Non-blocking warning shown in the cockpit when one or more EventSub
 * subscriptions are not in an `enabled` state (typically because the user
 * revoked the OAuth scope or never granted it). The dashboard remains
 * fully usable; we just nudge the user to reconnect Twitch.
 */
const ScopeDriftBanner = ({ broadcasterUserId }: Props) => {
  const [drifted, setDrifted] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!broadcasterUserId) return;
    (async () => {
      const { data } = await supabase
        .from("twitch_eventsub_subscriptions")
        .select("type, status")
        .eq("broadcaster_user_id", broadcasterUserId)
        .neq("status", "enabled");
      if (cancelled) return;
      const types = Array.from(new Set((data ?? []).map((r) => r.type)));
      setDrifted(types);
    })();
    return () => {
      cancelled = true;
    };
  }, [broadcasterUserId]);

  if (drifted.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/[0.04] p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          Reconnecte Twitch pour réactiver certains signaux.
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Signaux indisponibles : {drifted.join(", ")}
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to="/connect-twitch">Reconnecter</Link>
      </Button>
    </div>
  );
};

export default ScopeDriftBanner;
