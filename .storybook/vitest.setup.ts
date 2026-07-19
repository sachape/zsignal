import { beforeAll } from "vitest";
import { setProjectAnnotations } from "@storybook/react-vite";
// IMPORTANT : sans ces annotations, le hook axe d'addon-a11y n'est PAS branché
// dans le run vitest → `a11y.test:"error"` reste inopérant et la CI ne détecte
// AUCUNE régression d'accessibilité (elle passe au vert quoi qu'il arrive).
// Les inclure fait réellement échouer le test sur toute VIOLATION axe.
import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import previewAnnotations from "./preview";

// Applique le preview partagé (providers, thème, portails) + l'a11y aux stories testées.
const project = setProjectAnnotations([a11yAddonAnnotations, previewAnnotations]);
beforeAll(project.beforeAll);
