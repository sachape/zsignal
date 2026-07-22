import type { Meta, StoryObj } from "@storybook/react-vite";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { common, prop, CAT } from "./_argTypes";

const meta: Meta<typeof ResizablePanelGroup> = {
  title: "Components/Content & Structure/Resizable",
  component: ResizablePanelGroup,
  tags: ["autodocs"],
  argTypes: {
    ...common("children", "className"),
    direction: prop(
      "Axe de découpe des panneaux. Détermine aussi le sens des flèches au clavier sur la poignée.",
      { control: "inline-radio", options: ["horizontal", "vertical"], category: CAT.layout },
    ),
    autoSaveId: prop("Identifiant de persistance : les tailles choisies sont mémorisées et restaurées.", { control: "text", category: CAT.advanced }),
    onLayout: prop("Appelé à chaque redimensionnement, avec les tailles en pourcentage.", { control: false, category: CAT.events }),
  },
  parameters: {
    layout: "centered",
    docs: { description: { component: "Resizable — panneaux redimensionnables par l'utilisateur. La poignée est un `separator` accessible au clavier (flèches) ; `withHandle` affiche une prise visible." } },
  },
};
export default meta;
type S = StoryObj<typeof ResizablePanelGroup>;

const Cell = ({ label }: { label: string }) => (
  <div className="flex h-full items-center justify-center p-4 text-[14px] text-muted-foreground">{label}</div>
);

export const Horizontal: S = {
  render: () => (
    <ResizablePanelGroup direction="horizontal" className="h-40 w-[420px] rounded-md border">
      <ResizablePanel defaultSize={40}><Cell label="Panneau A" /></ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={60}><Cell label="Panneau B" /></ResizablePanel>
    </ResizablePanelGroup>
  ),
};

export const Vertical: S = {
  render: () => (
    <ResizablePanelGroup direction="vertical" className="h-56 w-[420px] rounded-md border">
      <ResizablePanel defaultSize={50}><Cell label="Haut" /></ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}><Cell label="Bas" /></ResizablePanel>
    </ResizablePanelGroup>
  ),
};
