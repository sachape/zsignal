import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Radio,
  CalendarCheck,
  Users,
  BookOpen,
  Trophy,
  LogOut,
  Star,
  ChevronUp,
  CreditCard,
  Settings,
  Sparkles,
  Bookmark,
  TrendingUp,
  Activity,
  Zap,
  MessageCircle,
  Clapperboard,
  CalendarDays,
  Type,
  Network,
  Rocket,
} from "lucide-react";
import logo from "@/assets/logo.svg";
import logoMark from "@/assets/logo-mark.svg";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { analytics } from "@/services/analytics";
import { cn } from "@/lib/utils";
import SidebarStreamerSearch from "@/components/SidebarStreamerSearch";
import { getCachedXpData, getXpLevel, XP_CACHE_EVENT } from "@/services/xpEngine";
import { getWatchlist } from "@/services/benchmarkWatchlist";
import { computeAlerts, areAlertsDismissed } from "@/services/competitorAlerts";

const cockpitItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard, end: true, secondary: false },
  { title: "Analyse", url: "/analyse", icon: Activity, end: false, secondary: false },
  { title: "Lives", url: "/lives", icon: Radio, end: false, secondary: false },
  { title: "Feuille de route", url: "/plan", icon: CalendarCheck, end: false, secondary: false },
  { title: "Progression", url: "/progression", icon: Star, end: false, secondary: false },
  { title: "Réseaux", url: "/reseaux", icon: Network, end: false, secondary: false },
  { title: "Clips", url: "/clips", icon: Clapperboard, end: false, secondary: true },
  { title: "Planning", url: "/schedule", icon: CalendarDays, end: false, secondary: true },
  { title: "Simulateur", url: "/simulator", icon: TrendingUp, end: false, secondary: true },
  { title: "Quêtes", url: "/quetes", icon: Zap, end: false, secondary: true },
];

const benchmarkItems = [
  { title: "Concurrents", url: "/competitors", icon: Users, end: false, secondary: false },
  { title: "Classements", url: "/classements", icon: Trophy, end: false, secondary: false },
  { title: "Watchlist", url: "/watchlist", icon: Bookmark, end: false, secondary: true },
  { title: "Playbooks", url: "/playbooks", icon: BookOpen, end: false, secondary: true },
  { title: "Titres", url: "/outils/titres", icon: Type, end: false, secondary: true },
];


const NOTIF_EVENT = "quetes-notif-update";

const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { isPro, plan } = usePlan();
  const navigate = useNavigate();

  const [hasNewBadge, setHasNewBadge] = useState(false);
  const [hasWatchlistAlerts, setHasWatchlistAlerts] = useState(false);
  const [cachedTotalXp, setCachedTotalXp] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const check = () => {
      try {
        setHasNewBadge(localStorage.getItem(`quetes_new_${user.id}`) === "1");
      } catch { /* noop */ }
    };
    check();
    window.addEventListener(NOTIF_EVENT, check);
    return () => window.removeEventListener(NOTIF_EVENT, check);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const check = () => {
      try {
        const uid = user.id;
        const list = getWatchlist(uid);
        const alerts = computeAlerts(uid, list);
        const dismissed = areAlertsDismissed(uid);
        setHasWatchlistAlerts(alerts.length > 0 && !dismissed);
      } catch { /* noop */ }
    };
    check();
    window.addEventListener("streampulse:watchlist-changed", check);
    window.addEventListener("streampulse:alerts-dismissed", check);
    return () => {
      window.removeEventListener("streampulse:watchlist-changed", check);
      window.removeEventListener("streampulse:alerts-dismissed", check);
    };
  }, [user]);

  const refreshXp = useCallback(() => {
    if (!user) return;
    const xp = getCachedXpData(user.id);
    setCachedTotalXp(xp);
  }, [user]);

  useEffect(() => {
    refreshXp();
    window.addEventListener(XP_CACHE_EVENT, refreshXp);
    return () => window.removeEventListener(XP_CACHE_EVENT, refreshXp);
  }, [refreshXp]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderItems = (items: typeof cockpitItems, withDivider = false) => {
    const nodes: React.ReactNode[] = [];
    let dividerInserted = false;

    items.forEach((item, idx) => {
      if (withDivider && !dividerInserted && item.secondary) {
        dividerInserted = true;
        nodes.push(
          <li key="__divider" className="mx-2 my-1 h-px bg-border/40" role="separator" />,
        );
      }

      nodes.push(
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild tooltip={item.title}>
            <NavLink
              to={item.url}
              end={item.end}
              className={cn(
                "flex w-full items-center gap-2",
                item.secondary && "text-muted-foreground/70",
              )}
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            >
              <span className="relative shrink-0">
                <item.icon className={item.secondary ? "h-3.5 w-3.5" : "h-4 w-4"} />
                {item.url === "/quetes" && hasNewBadge && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                )}
                {item.url === "/watchlist" && hasWatchlistAlerts && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                )}
              </span>
              {!collapsed && (
                <span className={item.secondary ? "text-[13px]" : undefined}>
                  {item.title}
                </span>
              )}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>,
      );
    });

    return nodes;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pb-3">
        <NavLink
          to={user ? "/dashboard" : "/"}
          className="flex h-10 items-center px-2"
          aria-label="Streamnco"
        >
          {collapsed ? (
            <img src={logoMark} alt="Streamnco" className="h-7 w-7" />
          ) : (
            <img src={logo} alt="Streamnco" className="h-6 w-auto" />
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        {!collapsed && (
          <div className="px-2 pt-1">
            <div className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Recherche
            </div>
          </div>
        )}
        <SidebarStreamerSearch collapsed={collapsed} />
        <div className="mx-2 mb-1 mt-1 h-px bg-border/50" />

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Cockpit</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(cockpitItems, true)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Benchmark</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(benchmarkItems, true)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter>
        {/* XP micro-widget */}
        {user && cachedTotalXp !== null && (() => {
          const xp = getXpLevel(cachedTotalXp);
          const progress = xp.progressToNext ?? 100;
          return (
            <Link
              to="/quetes"
              className={cn(
                "mb-1 flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-sidebar-accent",
                collapsed && "justify-center p-1",
              )}
              title={`Niveau ${xp.level} · ${xp.label} · ${xp.totalXp} XP`}
            >
              <span className="shrink-0 text-base leading-none">{xp.icon}</span>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-foreground leading-none">
                    Niv. {xp.level} · {xp.label}
                  </p>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[9px] tabular-nums text-muted-foreground/60">
                    {xp.totalXp} XP
                  </p>
                </div>
              )}
            </Link>
          );
        })()}

        {/* Upgrade CTA */}
        {user && !isPro && (
          <Link
            to="/pricing"
            className={cn(
              "mb-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-primary-foreground transition-opacity hover:opacity-90",
              collapsed ? "px-2" : "px-4",
            )}
            title="Passer au Pro"
            onClick={() => analytics.upgradeClicked("pro", "sidebar")}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="text-sm font-semibold">Passer au Pro</span>
            )}
          </Link>
        )}

        {user && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-sidebar-accent",
                  collapsed && "justify-center p-1",
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {user.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        Compte
                      </p>
                      <p className="truncate text-xs font-medium text-foreground">
                        {user.email}
                      </p>
                    </div>
                    <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                  </>
                )}
              </button>
            </PopoverTrigger>

            <PopoverContent
              side="top"
              align="start"
              sideOffset={8}
              className="w-64 p-1.5"
            >
              {/* Identity — non-cliquable */}
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                  {user.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {user.email}
                  </p>
                  <span className={cn(
                    "mt-0.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                    isPro
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/60 text-muted-foreground"
                  )}>
                    {isPro && <Sparkles className="h-2.5 w-2.5" />}
                    {plan === "pro" ? "Plan Pro" : plan === "growth" ? "Plan Growth" : "Plan Gratuit"}
                  </span>
                </div>
              </div>

              <div className="my-1 h-px bg-border/60" />

              {/* Navigation */}
              <Link
                to="/settings"
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                Mon compte
              </Link>
              <Link
                to="/billing"
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50"
              >
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Facturation
              </Link>
              <Link
                to="/help"
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50"
              >
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                Centre d'aide
              </Link>

              <button
                type="button"
                onClick={() => {
                  const w = window as unknown as { $crisp?: unknown[] };
                  if (!w.$crisp || typeof (w.$crisp as { push?: unknown }).push !== "function") return;
                  try {
                    (w.$crisp as unknown[]).push(["do", "chat:show"] as never);
                    (w.$crisp as unknown[]).push(["do", "chat:open"] as never);
                  } catch {
                    // fail silently if Crisp is unavailable
                  }
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50"
              >
                <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Support
              </button>

              <div className="my-1 h-px bg-border/60" />

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                Se déconnecter
              </button>
            </PopoverContent>
          </Popover>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
