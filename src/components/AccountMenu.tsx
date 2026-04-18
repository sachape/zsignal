import { useNavigate } from "react-router-dom";
import { ChevronDown, ExternalLink, Link2, Unplug } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";

/**
 * Top-right header identity = CONNECTED PLATFORM (Twitch) only.
 *
 * Strictly separates the StreamPulse app account (which lives in the sidebar
 * footer) from the connected Twitch identity. The compact menu stays minimal:
 *   - connected   → Voir mon compte Twitch · Déconnecter Twitch
 *   - disconnected → Connecter Twitch
 *
 * App-level actions (logout, sync refresh, full report) intentionally do NOT
 * live here — they belong to the sidebar footer or in-page surfaces.
 */
const AccountMenu = () => {
  const { user } = useAuth();
  const { isConnected, account } = useTwitchConnection();
  const navigate = useNavigate();

  if (!user) return null;

  // Not connected: single CTA, no dropdown noise.
  if (!isConnected || !account) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2 text-xs"
        onClick={() => navigate("/connect-twitch")}
      >
        <Link2 className="h-3.5 w-3.5" />
        Connecter Twitch
      </Button>
    );
  }

  const login = account.platform_login ?? "";
  const displayName = account.platform_display_name || login;
  const avatarUrl = account.profile_image_url ?? null;

  const handleDisconnect = () => {
    // Disconnect flow lives on the Twitch settings page so users see what
    // they're about to do (revoke OAuth, drop cached profile, etc.).
    navigate("/connect-twitch");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex h-9 items-center gap-2.5 rounded-full border border-border/60 bg-card/40 pl-1 pr-2.5 text-muted-foreground hover:bg-card/70 hover:text-foreground"
        >
          <Avatar className="h-7 w-7 rounded-full border border-border/60">
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={login} className="object-cover" />
            )}
            <AvatarFallback className="rounded-full bg-muted text-[10px] font-semibold text-foreground">
              {(login || "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-xs font-medium leading-none text-foreground md:inline">
            {displayName}
          </span>
          <ChevronDown className="ml-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 p-1.5">
        {login && (
          <DropdownMenuItem asChild className="gap-2.5 px-2.5 py-2 text-xs">
            <a
              href={`https://www.twitch.tv/${login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span>Voir mon compte Twitch</span>
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          onClick={handleDisconnect}
          className="gap-2.5 px-2.5 py-2 text-xs text-destructive focus:text-destructive"
        >
          <Unplug className="h-3.5 w-3.5 shrink-0" />
          <span>Déconnecter Twitch</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountMenu;
