import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

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
    <Toggle
      className="rounded-md px-2 py-2 text-foreground"
      icon={isLight ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      label="Apparence"
      checked={isLight}
      onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
    />
  );
};

export default ThemeToggle;
