import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Rocket,
  Inbox,
  Users,
  Network,
  Star,
  LogOut,
  ChevronUp,
  CreditCard,
  Settings,
  Sparkles,
  BookOpen,
  MessageCircle,
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
import { getCachedXpData, getXpLevel, XP_CACHE_EVENT } from "@/services/xpEngine";
import { findActiveSection } from "@/components/SectionTabs";
import SidebarStreamerSearch from "@/components/SidebarStreamerSearch";

type NavEntry = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  // Extra paths under which this entry should be highlighted as active.
  matchSection?: "live-studio" | "content-studio" | "benchmark";
};

const primaryItems: NavEntry[] = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard, end: true },
  { title: "Analyse", url: "/analyse", icon: Activity },
  { title: "Live Studio", url: "/live-setup", icon: Rocket, matchSection: "live-studio" },
  { title: "Content Studio", url: "/content-queue", icon: Inbox, matchSection: "content-studio" },
  { title: "Benchmark", url: "/competitors", icon: Users, matchSection: "benchmark" },
  { title: "Réseaux", url: "/reseaux", icon: Network },
];

const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { isPro, plan } = usePlan();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeSection = findActiveSection(pathname)?.id;

  const [cachedTotalXp, setCachedTotalXp] = useState<number | null>(null);

  const refreshXp = useCallback(() => {
    if (!user) return;
    setCachedTotalXp(getCachedXpData(user.id));
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pb-1">
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

      <SidebarStreamerSearch collapsed={collapsed} />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => {
                const sectionActive =
                  item.matchSection && activeSection === item.matchSection;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={!!sectionActive}>
                      <NavLink
                        to={item.url}
                        end={item.end}
                        className="flex w-full items-center gap-2"
                        activeClassName={
                          sectionActive
                            ? undefined
                            : "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* Progression (secondary) */}
        {user && (
          <SidebarMenuButton asChild tooltip="Progression" size="sm">
            <NavLink
              to="/progression"
              className="flex w-full items-center gap-2 text-muted-foreground/80"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
            >
              <Star className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span className="text-[13px]">Progression</span>}
            </NavLink>
          </SidebarMenuButton>
        )}

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
                  <p className="text-[10px] font-semibold leading-none text-foreground">
                    Niv. {xp.level} · {xp.label}
                  </p>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </Link>
          );
        })()}

        {user && !isPro && (
          <Link
            to="/billing"
            className={cn(
              "mb-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-primary-foreground transition-opacity hover:opacity-90",
              collapsed ? "px-2" : "px-4",
            )}
            title="Passer au Pro"
            onClick={() => analytics.upgradeClicked("pro", "sidebar")}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm font-semibold">Passer au Pro</span>}
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
                      <p className="truncate text-xs font-medium text-foreground">
                        {user.email}
                      </p>
                    </div>
                    <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                  </>
                )}
              </button>
            </PopoverTrigger>

            <PopoverContent side="top" align="start" sideOffset={8} className="w-64 p-1.5">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                  {user.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{user.email}</p>
                  <span
                    className={cn(
                      "mt-0.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                      isPro
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/60 text-muted-foreground",
                    )}
                  >
                    {isPro && <Sparkles className="h-2.5 w-2.5" />}
                    {plan === "pro" ? "Plan Pro" : plan === "growth" ? "Plan Growth" : "Plan Gratuit"}
                  </span>
                </div>
              </div>

              <div className="my-1 h-px bg-border/60" />

              <Link to="/settings" className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                Mon compte
              </Link>
              <Link to="/billing" className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Facturation
              </Link>
              <Link to="/help" className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50">
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
                    /* noop */
                  }
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50"
              >
                <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Support
              </button>

              <div className="my-1 h-px bg-border/60" />

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
