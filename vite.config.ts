import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// Repli de configuration Supabase.
//
// Quand la plateforme de build ne fournit pas ces variables, Vite les remplace
// par `undefined`, `createClient` jette au chargement du module et
// l'application ne monte jamais : page entièrement vide, sans erreur. C'est
// l'état dans lequel la production est restée plusieurs semaines sans que rien
// ne le signale.
//
// Ces deux valeurs sont publiques par conception : elles sont livrées au
// navigateur dans le bundle, et l'accès aux données est gouverné par la RLS,
// pas par leur confidentialité. Les figer ici enlève au build sa dépendance à
// l'injection d'environnement. L'environnement reste prioritaire quand il est
// fourni ; ce repli ne s'applique qu'à son absence.
const SUPABASE_FALLBACK = {
  VITE_SUPABASE_URL: "https://poblhczgdbnfunroshul.supabase.co",
  // À renseigner : clé publishable (anon) du projet, disponible dans
  // Desktop/zsignal/.env sous VITE_SUPABASE_PUBLISHABLE_KEY.
  VITE_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmxoY3pnZGJuZnVucm9zaHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyODE1MTksImV4cCI6MjA5MTg1NzUxOX0.AZytxuMjgJQGYWV7UpKLD3Sbd6x6PbUEGL1wlr4l8M0",
} as const;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseDefines = Object.fromEntries(
    Object.entries(SUPABASE_FALLBACK).map(([name, fallback]) => [
      `import.meta.env.${name}`,
      JSON.stringify(env[name] || fallback),
    ]),
  );

  return {
  define: supabaseDefines,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), mcpPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "radix-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs",
            "@radix-ui/react-accordion",
            "@radix-ui/react-select",
          ],
          "icons-vendor": ["lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  };
});
