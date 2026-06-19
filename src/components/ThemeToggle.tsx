import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Apparence toggle (sombre / clair). Lives in the account menu.
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
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label="Basculer le thème clair ou sombre"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className="flex w-full items-center justify-between gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50"
    >
      <span className="flex items-center gap-2.5">
        {isLight ? (
          <Sun className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Moon className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        Apparence
      </span>
      <span className="text-xs font-medium text-muted-foreground">
        {isLight ? "Clair" : "Sombre"}
      </span>
    </button>
  );
};

export default ThemeToggle;
