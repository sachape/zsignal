import type { Meta, StoryObj } from "@storybook/react-vite";
import AssistedDebriefPanel from "@/components/live/AssistedDebriefPanel";
import { withApp } from "./_withApp";

// Généré (catalogue). Fixture heuristique — ajuste si le rendu est vide/faux.
// tags ["catalog", "!test"] : navigable dans Storybook mais retiré du test
// runner (features lourdes/média qui ne tournent pas). a11y off : pas de hints
// axe sur des fixtures approximatives. Providers app via withApp.
const meta: Meta = { title: "Catalogue/Live/AssistedDebriefPanel", tags: ["catalog", "!test"], decorators: [withApp], parameters: { layout: "padded", a11y: { test: "off" }, chromatic: { disableSnapshot: true } } };
export default meta;

export const Default: StoryObj = { render: () => <AssistedDebriefPanel session={{} as any} signalLimited={true} /> };
