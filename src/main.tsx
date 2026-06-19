import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { captureAttributionFromUrl } from "./services/metaPixel";

// Capture UTMs / fbclid / gclid as early as possible so they survive
// SPA navigations through the funnel (landing → analysis → signup → app).
captureAttributionFromUrl();

createRoot(document.getElementById("root")!).render(
  // Theme class is set on <html> so portaled UI inherits it. Default dark keeps
  // the existing look (and the dark-premium marketing site) untouched; the
  // light theme is opt-in via the account menu toggle.
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={false}
    disableTransitionOnChange
    storageKey="streamnco-theme"
  >
    <App />
  </ThemeProvider>,
);
