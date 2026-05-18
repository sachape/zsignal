import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ExternalLink, PlusCircle, Settings, Unplug } from "lucide-react";
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
import { useTwitchConnection, switchActiveAccount } from "@/hooks/useTwitchConnection";
import { usePlan } from "@/hooks/usePlan";

const AccountMenu = () => {
  const { user } = useAuth();
  const { isConnected, accounts, account, initializing } = useTwitchConnection();
  const { isGrowth, loading: planLoading } = usePlan();
  const navigate = useNavigate();

  const maxAccounts = planLoading ? 1 : isGrowth ? 3 : 1;
  const accountCount = accounts.length;
  const atLimit = accountCount >= maxAccounts;

  if (!user) return null;

  if (initializing) {
    return (
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/40"
        aria-label="Chargement du compte Twitch"
      >
        <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (!isConnected || !account) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2 text-xs"
        onClick={() => navigate("/connect-twitch")}
      >
        Connecter Twitch
      </Button>
    );
  }

  const login = account.platform_login ?? "";
  const displayName = account.platform_display_name || login;
  const avatarUrl = account.profile_image_url ?? null;

  const handleAddAccount = () => {
    if (!isGrowth) {
      navigate("/pricing");
      return;
    }
    if (atLimit) return;
    navigate("/connect-twitch?mode=add");
  };

  const counterLabel = `${accountCount}/${maxAccounts} ${
    maxAccounts > 1 ? "chaînes Twitch connectées" : "chaîne Twitch connectée"
  }`;

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

      <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-1.5">
        {/* Counter header */}
        <div className="flex items-center justify-between gap-2 px-2 pb-1.5 pt-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Mes chaînes
          </span>
          <span className="rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
            {accountCount}/{maxAccounts}
          </span>
        </div>
        <div className="px-2 pb-1.5 text-[10px] text-muted-foreground/80">
          {counterLabel}
        </div>

        {/* Account list */}
        {accounts.map((acc) => {
          const accLogin = acc.platform_login ?? "";
          const accName = acc.platform_display_name || accLogin;
          const isActive = accLogin === (account?.platform_login ?? "");
          return (
            <DropdownMenuItem
              key={acc.id}
              className="gap-2.5 px-2.5 py-2 text-xs"
              onClick={() => {
                if (!isActive) switchActiveAccount(user.id, accLogin, acc.id);
              }}
            >
              <Avatar className="h-5 w-5 shrink-0 rounded-full">
                {acc.profile_image_url && (
                  <AvatarImage src={acc.profile_image_url} alt={accLogin} className="object-cover" />
                )}
                <AvatarFallback className="rounded-full bg-muted text-[8px] font-semibold">
                  {accLogin.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate font-medium">{accName}</span>
              {isActive && (
                <>
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                    Active
                  </span>
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                </>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="my-1" />

        {/* View on Twitch */}
        {login && (
          <DropdownMenuItem asChild className="gap-2.5 px-2.5 py-2 text-xs">
            <a
              href={`https://www.twitch.tv/${login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <ExternalLink />
              <span>Voir mon compte Twitch</span>
            </a>
          </DropdownMenuItem>
        )}

        {/* Add account / upgrade / limit */}
        {!isGrowth && atLimit ? (
          <DropdownMenuItem
            className="gap-2.5 px-2.5 py-2 text-xs"
            onClick={() => navigate("/pricing")}
          >
            <PlusCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="flex-1">Passe à Growth pour connecter jusqu’à 3 chaînes</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
              Growth
            </span>
          </DropdownMenuItem>
        ) : isGrowth && atLimit ? (
          <DropdownMenuItem
            disabled
            className="gap-2.5 px-2.5 py-2 text-xs opacity-60"
          >
            <PlusCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">Limite Growth atteinte : 3/3</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="gap-2.5 px-2.5 py-2 text-xs"
            onClick={handleAddAccount}
          >
            <PlusCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">Ajouter une chaîne Twitch</span>
            {!isGrowth && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                Growth
              </span>
            )}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          onClick={() => navigate("/settings/twitch-accounts")}
          className="gap-2.5 px-2.5 py-2 text-xs"
        >
          <Settings />
          <span>Gérer mes comptes Twitch</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountMenu;
