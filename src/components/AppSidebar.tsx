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
import { cn } from "@/lib/utils";
import SidebarStreamerSearch from "@/components/SidebarStreamerSearch";

// Cockpit is the single authenticated home. The detailed diagnosis is a
// drill-down reachable from the cockpit itself, so it intentionally does
// NOT appear as a top-level sidebar destination.
const cockpitItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard, end: true },
  { title: "Lives", url: "/lives", icon: Radio, end: false },
  { title: "Plan de la semaine", url: "/plan", icon: CalendarCheck, end: false },
  { title: "Progression", url: "/affiliation", icon: Star, end: false },
  { title: "Simulateur", url: "/simulator", icon: TrendingUp, end: false },
];

const benchmarkItems = [
  { title: "Concurrents", url: "/competitors", icon: Users, end: false },
  { title: "Classements", url: "/leaders", icon: Trophy, end: false },
  { title: "Watchlist", url: "/watchlist", icon: Bookmark, end: false },
  { title: "Playbooks", url: "/playbooks", icon: BookOpen, end: false },
];


const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderItems = (items: typeof cockpitItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild tooltip={item.title}>
          <NavLink
            to={item.url}
            end={item.end}
            className="flex w-full items-center gap-2"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

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
            <SidebarMenu>{renderItems(cockpitItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Benchmark</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(benchmarkItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter>
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
                  <span className="mt-0.5 inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Plan Gratuit
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

              {/* Upgrade CTA */}
              <Link
                to="/pricing"
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Passer au Pro
              </Link>

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
