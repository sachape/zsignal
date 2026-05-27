import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureAttributionFromUrl } from "./services/metaPixel";

// Capture UTMs / fbclid / gclid as early as possible so they survive
// SPA navigations through the funnel (landing → analysis → signup → app).
captureAttributionFromUrl();

createRoot(document.getElementById("root")!).render(<App />);
