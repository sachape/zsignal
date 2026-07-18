import type { Meta, StoryObj } from "@storybook/react-vite";
import TrustCard from "@/components/TrustCard";
import { withApp } from "./_withApp";

// Généré (catalogue). Fixture heuristique — ajuste si le rendu est vide/faux.
// tags ["catalog", "!test"] : navigable dans Storybook mais retiré du test
// runner (features lourdes/média qui ne tournent pas). a11y off : pas de hints
// axe sur des fixtures approximatives. Providers app via withApp.
const meta: Meta = { title: "Catalogue/General/TrustCard", tags: ["catalog", "!test"], decorators: [withApp], parameters: { layout: "padded", a11y: { test: "off" } } };
export default meta;

export const Default: StoryObj = { render: () => <TrustCard icon={{} as any} title={"Exemple"} description={"Exemple"} /> };
