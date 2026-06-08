import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface IdentityBadge {
  label: string;
  variant?: "default" | "secondary" | "outline" | "accent" | "destructive";
}

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /**
   * Optional channel identity block: avatar + login + badges shown next to the
   * title. Used on report / dashboard headers to give the page a strong,
   * trustworthy identity instead of just a bare display name.
   */
  avatarUrl?: string | null;
  avatarLogin?: string | null;
  badges?: IdentityBadge[];
}

function initialsFor(login?: string | null, title?: string): string {
  const base = (login || title || "?").trim();
  if (!base) return "?";
  return base.slice(0, 2).toUpperCase();
}

/**
 * Standard product page header. One source of truth for title hierarchy.
 *
 * When `avatarUrl` (or `avatarLogin`) is provided, renders a premium channel
 * identity block: rounded Twitch profile image (with safe initials fallback),
 * display name as H1, @login + badges (live / partner / affiliate) as a tidy
 * subline. Falls back gracefully to the plain title-only header.
 */
const PageHeader = ({
  eyebrow,
  title,
  description,
  action,
  avatarUrl,
  avatarLogin,
  badges,
}: Props) => {
  const hasIdentity = !!(avatarUrl || avatarLogin);

  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div className="flex min-w-0 items-start gap-4">
        {hasIdentity && (
          <Avatar className="mt-0.5 h-14 w-14 shrink-0 rounded-full border border-border/60 bg-muted">
            {avatarUrl && (
              <AvatarImage
                src={avatarUrl}
                alt={avatarLogin ? `Avatar ${avatarLogin}` : "Avatar"}
              />
            )}
            <AvatarFallback className="rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {initialsFor(avatarLogin, title)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-[28px]">
            {title}
          </h1>
          {(avatarLogin || (badges && badges.length > 0)) && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {avatarLogin && (
                <span className="text-sm text-muted-foreground">
                  @{avatarLogin}
                </span>
              )}
              {badges?.map((b) => (
                <Badge
                  key={b.label}
                  variant={b.variant ?? "secondary"}
                  className="text-[10px] font-semibold uppercase tracking-wider"
                >
                  {b.label}
                </Badge>
              ))}
            </div>
          )}
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
};

export default PageHeader;
