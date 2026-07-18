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
        // on le redéclare, sinon les `@/...` des stories et du preview ne résolvent pas.
        resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            provider: "playwright",
            headless: true,
            instances: [{ browser: "chromium" }],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
});
