import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    // Les stories du DS vivent avec le DS.
    "../design-system/**/*.mdx",
    "../design-system/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    // Plus toute story ajoutée dans src/.
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    // a11y + docs : les deux qui comptent pour un DS.
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    // addon-vitest : rend chaque story dans un Chromium headless (smoke-test +
    // a11y) au run des tests. Câblé proprement dans vitest.config (projet
    // `storybook`, isolé du projet `unit`) — voir ce fichier pour l'alias `@`
    // et le plugin react (runtime JSX) que le projet de test exige.
    "@storybook/addon-vitest",
  ],
  framework: "@storybook/react-vite",
  async viteFinal(cfg) {
    // Le vite.config du projet charge des plugins spécifiques à Lovable
    // (component-tagger, MCP Supabase) qui n'ont aucun sens dans Storybook et
    // peuvent tenter d'ouvrir des ports / dépendances runtime. On les retire ;
    // on garde react et l'alias `@` (déjà fusionnés depuis le vite.config).
    cfg.plugins = (cfg.plugins ?? []).filter((p) => {
      const name = p && typeof p === "object" && "name" in p ? p.name : "";
      return !/lovable|tagger|supabase/i.test(String(name));
    });
    return cfg;
  },
};

export default config;
