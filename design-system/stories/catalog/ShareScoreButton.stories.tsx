import type { Meta, StoryObj } from "@storybook/react-vite";
import ShareScoreButton from "@/components/ShareScoreButton";
import { withApp } from "./_withApp";

// Généré (catalogue). Fixture heuristique — ajuste si le rendu est vide/faux.
// tag "catalog" : navigable dans Storybook mais hors smoke-test (features
// lourdes/média qui ne tournent pas en headless). Providers app via withApp.
const meta: Meta = { title: "Catalogue/General/ShareScoreButton", tags: ["catalog"], decorators: [withApp], parameters: { layout: "padded" } };
export default meta;

export const Default: StoryObj = { render: () => <ShareScoreButton score={{} as any} displayName={"Exemple"} login={null} date={"Exemple"} /> };
