import type { Meta, StoryObj } from "@storybook/react-vite";
import VisualGenerationDialog from "@/components/visual-studio/VisualGenerationDialog";
import { withApp } from "./_withApp";

// Généré (catalogue). Fixture heuristique — ajuste si le rendu est vide/faux.
// tag "catalog" : navigable dans Storybook mais hors smoke-test (features
// lourdes/média qui ne tournent pas en headless). Providers app via withApp.
const meta: Meta = { title: "Catalogue/Visual-studio/VisualGenerationDialog", tags: ["catalog"], decorators: [withApp], parameters: { layout: "padded" } };
export default meta;

export const Default: StoryObj = { render: () => <VisualGenerationDialog open={true} /> };
