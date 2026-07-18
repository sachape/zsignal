import { beforeAll } from "vitest";
import { setProjectAnnotations } from "@storybook/react-vite";
import previewAnnotations from "./preview";

// Applique le preview partagé (providers, thème, portails) aux stories testées.
const project = setProjectAnnotations([previewAnnotations]);
beforeAll(project.beforeAll);
