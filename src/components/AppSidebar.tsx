import { useNavigate } from "react-router-dom";
import {
  Zap,
  LayoutDashboard,
  CalendarCheck,
  Users,
  BookOpen,
  Trophy,
  LogOut,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import SidebarStreamerSearch from "@/components/SidebarStreamerSearch";

// Cockpit is the single authenticated home. The detailed diagnosis is a
// drill-down reachable from the cockpit itself, so it intentionally does
// NOT appear as a top-level sidebar destination.
const cockpitItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard, end: true },
  { title: "Plan de la semaine", url: "/plan", icon: CalendarCheck, end: false },
];

const benchmarkItems = [
  { title: "Concurrents", url: "/competitors", icon: Users, end: false },
  { title: "Classements", url: "/leaders", icon: Trophy, end: false },
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
          className="flex h-10 items-center gap-2 px-2"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-foreground">
              StreamPulse
            </span>
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
          <div
            className={cn(
              "flex items-center gap-2 rounded-md p-2",
              collapsed && "justify-center p-1",
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">
              {user.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Compte StreamPulse
                </p>
                <p className="truncate text-xs font-medium text-foreground">
                  {user.email}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label="Déconnexion"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
