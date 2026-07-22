import type { Meta, StoryObj } from "@storybook/react-vite";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

const meta: Meta<typeof ResizablePanelGroup> = {
  title: "Components/Content & Structure/Resizable",
  component: ResizablePanelGroup,
  tags: ["autodocs"],
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
