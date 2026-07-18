import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Deux projets de test :
//  - `unit`      : tes tests unitaires existants, INCHANGÉS.
//  - `storybook` : chaque story rendue dans un navigateur headless (smoke test
//                  + a11y). Ajouté par `storybook add @storybook/addon-vitest`.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
      },
      {
        // react() applique le runtime JSX automatique (sinon « React is not
        // defined » sur les stories/preview qui utilisent JSX sans importer React).
        plugins: [react(), storybookTest({ configDir: path.join(dirname, ".storybook") })],
        // Le projet storybook n'hérite pas de l'alias du vite.config du projet —
        // on le redéclare. L'alias SPÉCIFIQUE du mock Supabase doit venir AVANT
        // `@` (sinon `@` capture le préfixe), sinon les composants du catalogue
        // chargent le vrai client et crashent (createClient sans URL).
        resolve: {
          alias: {
            "@/integrations/supabase/client": path.resolve(__dirname, "./.storybook/mocks/supabase.ts"),
            "@": path.resolve(__dirname, "./src"),
          },
        },
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            provider: "playwright",
            headless: true,
            instances: [
              {
                browser: "chromium",
                // --disable-dev-shm-usage : en conteneur/sandbox, /dev/shm est
                // minuscule ; Chromium le sature et meurt (« Browser connection
                // was closed ») après quelques dizaines de tests. Ce flag le fait
                // écrire sur /tmp à la place. --no-sandbox : requis en conteneur.
                launch: { args: ["--disable-dev-shm-usage", "--no-sandbox"] },
              },
            ],
          },
          isolate: true,
          // Le CATALOGUE (design-system/stories/catalog/) est un inventaire de
          // composants FEATURE : navigable dans Storybook, mais hors du smoke-test
          // strict. L'exclusion se fait par le tag Storybook `!test` sur chaque
          // meta du catalogue (certains — éditeurs facecam/canvas, getUserMedia —
          // crashent le navigateur headless). Le test couvre le DS réutilisable.
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
});
