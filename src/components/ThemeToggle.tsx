import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * Apparence toggle (sombre / clair). Lives in the sidebar footer.
 * Persisted by next-themes (storageKey "streamnco-theme"); the class is set on
 * <html> so portaled UI (popovers, dialogs, toasts) inherits the theme too.
 */
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid a hydration/first-paint flash before next-themes resolves.
  const isLight = mounted && theme === "light";

  return (
    <div className="flex w-full items-center justify-between gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground">
      <Label htmlFor="theme-switch" className="flex cursor-pointer items-center gap-2.5 font-normal">
        {isLight ? (
          <Sun className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Moon className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        Apparence
      </Label>
      <Switch
        id="theme-switch"
        checked={isLight}
        onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
        aria-label="Basculer le thème clair ou sombre"
      />
    </div>
  );
};

export default ThemeToggle;
