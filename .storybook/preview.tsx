import type { Preview } from "@storybook/react-vite";
// Les tokens du DS + les styles globaux de l'app. Sans ça, les composants
// s'affichent hors de leur système (pas de lime, pas de surfaces).
import "../src/index.css";

const preview: Preview = {
  parameters: {
    // Le produit est sombre par défaut (:root = dark, .light est l'override).
    // On reflète ça dans le canvas Storybook.
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "hsl(220 20% 6%)" },
        { name: "light", value: "hsl(220 22% 94%)" },
      ],
    },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: "todo" },
  },
};

export default preview;
