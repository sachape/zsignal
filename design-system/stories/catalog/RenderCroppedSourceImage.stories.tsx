import type { Meta, StoryObj } from "@storybook/react-vite";
import { RenderCroppedSourceImage } from "@/components/clips/RenderCroppedSourceImage";
import { withApp } from "./_withApp";

// Généré (catalogue). Fixture heuristique — ajuste si le rendu est vide/faux.
// tag "catalog" : navigable dans Storybook mais hors smoke-test (features
// lourdes/média qui ne tournent pas en headless). Providers app via withApp.
const meta: Meta = { title: "Catalogue/Clips/RenderCroppedSourceImage", tags: ["catalog"], decorators: [withApp], parameters: { layout: "padded" } };
export default meta;

export const Default: StoryObj = { render: () => <RenderCroppedSourceImage imageUrl={"Exemple"} cropNormalized={{} as any} sourceWidth={42} sourceHeight={42} /> };
