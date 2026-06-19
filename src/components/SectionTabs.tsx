import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type Tab = { label: string; to: string; matches?: string[]; soon?: boolean; exact?: boolean };
type Section = { id: string; label: string; tabs: Tab[] };

// Each section groups several existing routes behind a single sidebar entry.
// SectionTabs renders a contextual tab bar at the top of the main area.
const SECTIONS: Section[] = [
  {
    id: "clips",
    label: "Clipping",
    tabs: [
      { label: "Mes clips", to: "/clipping", matches: ["/clipping"], exact: true },
      { label: "Créer", to: "/clips/vod-import", matches: ["/clips/vod-import"] },
      { label: "Queue", to: "/content-queue", matches: ["/content-queue"] },
      { label: "Moments proposés", to: "/clips", matches: ["/clips"], exact: true },
    ],
  },

  {
    id: "live-studio",
    label: "Live Studio",
    tabs: [
      { label: "Setup", to: "/live-setup", matches: ["/live-setup", "/live-studio"] },
      { label: "Historique", to: "/lives", matches: ["/lives"] },
      { label: "Planning", to: "/schedule", matches: ["/schedule"] },
      { label: "Simulateur", to: "/simulator", matches: ["/simulator"] },
      
    ],
  },
  {
    id: "content-studio",
    label: "File de contenu",
    tabs: [
      { label: "Queue", to: "/content-queue", matches: ["/content-queue", "/content-studio"] },
      { label: "Composer", to: "/composer", matches: ["/composer"] },
      { label: "Publications", to: "/publications", matches: ["/publications"] },
      
    ],
  },
  {
    id: "benchmark",
    label: "Benchmark",
    tabs: [
      { label: "Concurrents", to: "/competitors", matches: ["/competitors", "/benchmark"] },
      { label: "Classements", to: "/classements", matches: ["/classements"] },
      { label: "Watchlist", to: "/watchlist", matches: ["/watchlist"] },
    ],
  },
  {
    id: "resources",
    label: "Ressources",
    tabs: [
      { label: "Titres", to: "/outils/titres", matches: ["/outils/titres", "/resources", "/ressources"] },
      { label: "Playbooks", to: "/playbooks", matches: ["/playbooks"] },
    ],
  },
];

const tabMatches = (pathname: string, tab: Tab) => {
  const patterns = tab.matches ?? [tab.to];
  return patterns.some((p) =>
    tab.exact ? pathname === p : pathname === p || pathname.startsWith(`${p}/`),
  );
};

export const findActiveSection = (pathname: string) =>
  SECTIONS.find((s) => s.tabs.some((t) => tabMatches(pathname, t)));

const SectionTabs = () => {
  const { pathname } = useLocation();
  const section = findActiveSection(pathname);
  if (!section) return null;

  return (
    <div className="border-b border-border/60 bg-background/60 backdrop-blur-md">
      <div className="flex h-11 items-center gap-1 overflow-x-auto px-3 sm:px-4 md:px-6">
        <span className="mr-2 hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 md:inline">
          {section.label}
        </span>
        {section.tabs.map((tab) => {
          const active = tabMatches(pathname, tab);
          if (tab.soon) {
            return (
              <span
                key={tab.label}
                className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground/50"
              >
                {tab.label}
                <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium uppercase">
                  Bientôt
                </span>
              </span>
            );
          }
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default SectionTabs;
export { SECTIONS };
