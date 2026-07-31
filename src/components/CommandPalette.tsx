import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Activity,
  Users,
  Clapperboard,
  Palette,
  TrendingUp,
  BookOpen,
  Trophy,
  Bookmark,
  Search,
} from "lucide-react";

// Reprend les destinations de la sidebar (`navGroups` dans AppSidebar), avec les
// mêmes libellés : deux noms pour une même page, c'est deux endroits à apprendre.
const NAVIGATION = [
  { label: "Tableau de bord", to: "/dashboard", icon: LayoutDashboard, hint: "Vue d'ensemble" },
  { label: "Clipping", to: "/clipping", icon: Clapperboard, hint: "Un live → une vidéo 9:16" },
  { label: "Studio visuel", to: "/studio-visuel", icon: Palette, hint: "Bannière, story, annonce" },
  { label: "StreamScore", to: "/analyse", icon: Activity, hint: "Score, dimensions, signaux" },
  { label: "Benchmark", to: "/competitors", icon: Users, hint: "Comparer ta chaîne" },
  { label: "Progression", to: "/progression", icon: TrendingUp, hint: "Quêtes et niveaux" },
  { label: "Ressources", to: "/playbooks", icon: BookOpen, hint: "Playbooks et guides" },
];

// Destinations plus profondes, absentes de la sidebar : la palette sert aussi à
// sauter là où la navigation demanderait deux clics.
const RACCOURCIS = [
  { label: "Moments proposés", to: "/clips", icon: Clapperboard, hint: "Clips détectés" },
  { label: "Classements", to: "/classements", icon: Trophy },
  { label: "Watchlist", to: "/watchlist", icon: Bookmark },
];

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Recherche rapide"
        className="hidden gap-2 bg-muted/30 px-2.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground sm:flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Rechercher…</span>
        <kbd className="ml-2 rounded border border-border/60 bg-background px-1 text-[12px] tabular-nums text-muted-foreground">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Aller à une section, une action…" />
        <CommandList>
          <CommandEmpty>Aucun résultat</CommandEmpty>
          {[
            { heading: "Navigation", items: NAVIGATION },
            { heading: "Raccourcis", items: RACCOURCIS },
          ].map(({ heading, items }) => (
            <CommandGroup key={heading} heading={heading}>
              {items.map((item) => (
                <CommandItem
                  key={item.to}
                  value={`${item.label} ${item.hint ?? ""}`}
                  onSelect={() => go(item.to)}
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                  {item.hint && (
                    <span className="ml-auto text-xs text-muted-foreground/60">{item.hint}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default CommandPalette;
