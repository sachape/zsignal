import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    // Les stories du DS (primitives, patterns) — testées.
    "../design-system/**/*.mdx",
    "../design-system/stories/*.stories.@(js|jsx|mjs|ts|tsx)",
    // Sous Vitest, on EXCLUT deux dossiers navigables mais hors smoke-test :
    //  - docs/    : pages de doc (explorateur Tokens) — 100s de cartes qui
    //               saturent le navigateur headless, sans valeur de smoke-test.
    //  - catalog/ : 82 composants feature (certains canvas/getUserMedia) qui
    //               crashent en headless. Le test couvre le DS réutilisable.
    ...(process.env.VITEST
      ? []
      : [
          "../design-system/stories/docs/*.stories.@(js|jsx|mjs|ts|tsx)",
          "../design-system/stories/catalog/*.stories.@(js|jsx|mjs|ts|tsx)",
        ]),
    // Plus toute story ajoutée dans src/.
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    // a11y + docs : les deux qui comptent pour un DS.
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    // addon-vitest : rend chaque story dans un Chromium headless (smoke-test +
    // a11y + play functions) au run des tests. Câblé proprement dans
    // vitest.config (projet `storybook`, isolé du projet `unit`) — voir ce
    // fichier pour l'alias `@` et le plugin react (runtime JSX) qu'il exige.
    "@storybook/addon-vitest",
    // chromatic : regression VISUELLE. Snapshot de chaque story ; signale tout
    // changement de pixels entre deux versions. Complète le comportemental
    // (play) par le visuel. Nécessite un projet Chromium/token pour publier.
    "@chromatic-com/storybook",
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
    // Mock du client Supabase : les composants/hooks du catalogue qui tapent la
    // base montent sans réseau ni crash. Alias PLUS spécifique que `@` → placé
    // en tête pour gagner.
    const { fileURLToPath } = await import("node:url");
    const mock = fileURLToPath(new URL("./mocks/supabase.ts", import.meta.url));
    cfg.resolve = cfg.resolve ?? {};
    const alias = cfg.resolve.alias;
    // Ancré ^…$ (plugin-alias remplace la portion matchée : un match partiel
    // casserait le chemin). Couvre la forme aliasée `@/integrations/supabase/client`
    // ET les imports RELATIFS `../supabase/client` (ex. src/integrations/lovable/index.ts)
    // qui échappaient au mock → chargeaient le vrai client → « supabaseUrl is required »
    // en CI (pas de VITE_SUPABASE_* depuis que .env est dé-tracké), plantant Chromatic.
    const entry = { find: /^(?:@\/integrations\/supabase\/client|(?:\.\.\/)+supabase\/client)$/, replacement: mock };
    if (Array.isArray(alias)) alias.unshift(entry);
    else cfg.resolve.alias = [entry, ...Object.entries(alias ?? {}).map(([find, replacement]) => ({ find, replacement }))];
    return cfg;
  },
};

export default config;
