import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClipPreparationPanel } from "@/components/content-queue/ClipPreparationPanel";
import { withApp } from "./_withApp";

// Généré (catalogue). Fixture heuristique — ajuste si le rendu est vide/faux.
// tag "catalog" : navigable dans Storybook mais hors smoke-test (features
// lourdes/média qui ne tournent pas en headless). Providers app via withApp.
const meta: Meta = { title: "Catalogue/Content-queue/ClipPreparationPanel", tags: ["catalog"], decorators: [withApp], parameters: { layout: "padded" } };
export default meta;

export const Default: StoryObj = { render: () => <ClipPreparationPanel item={{} as any} /> };
