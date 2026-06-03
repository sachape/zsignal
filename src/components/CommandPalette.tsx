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
import {
  LayoutDashboard,
  Activity,
  Rocket,
  Inbox,
  Users,
  Network,
  Type,
  Clapperboard,
  CalendarDays,
  Trophy,
  Bookmark,
  Search,
} from "lucide-react";

const ITEMS = [
  { label: "Tableau de bord", to: "/dashboard", icon: LayoutDashboard, hint: "Vue d'ensemble" },
  { label: "Analyse de chaîne", to: "/analyse", icon: Activity, hint: "StreamScore et signaux" },
  { label: "Live Studio · Setup", to: "/live-setup", icon: Rocket, hint: "Préparer un live" },
  { label: "Live Studio · Titres", to: "/outils/titres", icon: Type, hint: "Générer des titres" },
  { label: "Live Studio · Planning", to: "/schedule", icon: CalendarDays, hint: "Planifier" },
  { label: "Content Studio · Queue", to: "/content-queue", icon: Inbox, hint: "Contenus à publier" },
  { label: "Content Studio · Clips", to: "/clips", icon: Clapperboard, hint: "Générer un clip" },
  { label: "Benchmark · Concurrents", to: "/competitors", icon: Users, hint: "Voir les concurrents" },
  { label: "Benchmark · Classements", to: "/classements", icon: Trophy },
  { label: "Benchmark · Watchlist", to: "/watchlist", icon: Bookmark },
  { label: "Réseaux", to: "/reseaux", icon: Network, hint: "Connecter YouTube, TikTok…" },
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-8 items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:flex"
        aria-label="Recherche rapide"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Rechercher…</span>
        <kbd className="ml-2 rounded border border-border/60 bg-background px-1 text-[10px] tabular-nums text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Aller à une section, une action…" />
        <CommandList>
          <CommandEmpty>Aucun résultat</CommandEmpty>
          <CommandGroup heading="Navigation">
            {ITEMS.map((item) => (
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
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default CommandPalette;
