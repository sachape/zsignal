import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import AccountMenu from "@/components/AccountMenu";
import LandingNav from "@/components/LandingNav";
import SectionTabs from "@/components/SectionTabs";
import CommandPalette from "@/components/CommandPalette";
import { useAuth } from "@/contexts/AuthContext";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <LandingNav />
        <main className="pt-14">{children}</main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md sm:px-4 md:px-6">
            <SidebarTrigger className="-ml-1.5 h-8 w-8 text-muted-foreground hover:text-foreground" />
            <div className="ml-auto flex items-center gap-2">
              <CommandPalette />
              <AccountMenu />
            </div>
          </header>

          <SectionTabs />

          <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppShell;
