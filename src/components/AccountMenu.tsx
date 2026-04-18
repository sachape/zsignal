import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ExternalLink,
  Link2,
  LogOut,
  RefreshCw,
  FileText,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { enqueueRefreshForSelf } from "@/services/autoRefreshRunner";

/**
 * Top-right account/integration menu. Replaces the previous
 * "Détail & connexion" sidebar group. Sidebar now stays purely
 * product-destinations.
 */
const AccountMenu = () => {
  const { user, signOut } = useAuth();
  const { isConnected, account } = useTwitchConnection();
  const navigate = useNavigate();

  if (!user) return null;

  const initial = user.email?.[0]?.toUpperCase() ?? "?";
  const twitchLogin = account?.platform_login ?? null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleRefresh = async () => {
    await enqueueRefreshForSelf("manual");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-2 text-muted-foreground hover:text-foreground"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-foreground">
            {initial}
          </span>
          <span className="hidden text-xs font-medium md:inline">
            {twitchLogin ? `@${twitchLogin}` : user.email}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {user.email}
          </span>
          <span className="text-[11px] font-normal text-muted-foreground">
            {isConnected
              ? `Twitch · @${twitchLogin} · connecté`
              : "Twitch non connecté"}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {isConnected && twitchLogin && (
          <DropdownMenuItem asChild>
            <a
              href={`https://www.twitch.tv/${twitchLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Voir mon compte Twitch
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => navigate("/connect-twitch")}>
          <Link2 className="h-3.5 w-3.5" />
          {isConnected ? "État de la connexion Twitch" : "Connecter Twitch"}
        </DropdownMenuItem>

        {isConnected && (
          <DropdownMenuItem onClick={() => navigate("/connect-twitch")}>
            <Unplug className="h-3.5 w-3.5" />
            Reconnecter / déconnecter Twitch
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser maintenant
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate("/result")}>
          <FileText className="h-3.5 w-3.5" />
          Voir le rapport complet
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountMenu;
