import type { Preview } from "@storybook/react-vite";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
// Les tokens du DS + les styles globaux de l'app. Sans ça, les composants
// s'affichent hors de leur système (pas de lime, pas de surfaces).
import "../src/index.css";

/**
 * Preview partagé (guidé par `npx storybook ai setup`).
 *
 * On enveloppe chaque story avec les providers SANS effet de bord — QueryClient,
 * Router, Tooltip — pour que la plupart des composants rendent. On n'ajoute PAS
 * AuthProvider ni Supabase : ils appellent le réseau au montage, et les stories
 * du DS sont présentationnelles (primitives + patterns), pas des pages connectées.
 *
 * Le toggle de thème (clair/sombre) est un vrai plus DS : voir chaque composant
 * dans les deux thèmes, via la classe `.light` sur <html> (comme next-themes).
 */

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const preview: Preview = {
  // autodocs : chaque composant obtient une page "Docs" (Overview) auto —
  // description + table des props (Component API) + toutes ses stories rendues.
  tags: ["autodocs"],
  // Toggle clair/sombre dans la barre d'outils Storybook.
  globalTypes: {
    theme: {
      description: "Thème",
      defaultValue: "dark",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "dark", title: "Sombre" },
          { value: "light", title: "Clair" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    // Thème : pose/retire la classe `.light` sur <html> (le produit est dark par
    // défaut ; `.light` est l'override — voir index.css).
    (Story, ctx) => {
      const light = ctx.globals.theme === "light";
      document.documentElement.classList.toggle("light", light);
      return <Story />;
    },
    // Racines de portail (toasts, modales, drawers) — créées avant le rendu.
    (Story) => {
      for (const id of ["modal-root", "drawer-root", "toast-root"]) {
        if (!document.getElementById(id)) {
          const el = document.createElement("div");
          el.id = id;
          document.body.appendChild(el);
        }
      }
      return <Story />;
    },
    // Providers sans effet de bord, appliqués à TOUTES les stories (le DS n'a
    // besoin que de ceux-là). Les providers de l'app (Auth, etc.) sont ajoutés
    // uniquement au catalogue via son décorateur `withApp` — ils tapent Supabase
    // au montage et n'ont de sens que pour les composants feature.
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TooltipProvider>
            <Story />
          </TooltipProvider>
        </BrowserRouter>
      </QueryClientProvider>
    ),
  ],
  parameters: {
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
    a11y: {
      // Mode informatif (n'échoue pas la CI). On coupe les règles « landmark »
      // qui flaguent à tort un composant rendu SEUL, hors page (une story n'a
      // pas de <main>). Le contraste, les labels, les rôles restent vérifiés.
      test: "todo",
      config: {
        rules: [
          { id: "region", enabled: false },
          { id: "landmark-one-main", enabled: false },
          { id: "page-has-heading-one", enabled: false },
        ],
      },
    },
  },
};

export default preview;
