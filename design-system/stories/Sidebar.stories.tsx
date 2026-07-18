import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup,
  SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarInset, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Film, Image, BarChart3, Radio } from "lucide-react";

/**
 * Sidebar — la navigation verticale de l'app (produit complexe, 5–20 items
 * groupés). Nécessite SidebarProvider (contexte ouvert/replié). Même fond que le
 * contenu + bordure : on ne fragmente pas l'espace (cf. Subtle Layering).
 */
const meta: Meta<typeof Sidebar> = {
  title: "Patterns/Sidebar",
  component: Sidebar,
  parameters: { controls: { disable: true }, docs: { description: { component: "Sidebar — la navigation verticale de l'app (produit complexe, 5–20 items groupés). Nécessite SidebarProvider (contexte ouvert/replié)." } },  layout: "fullscreen" },
};
export default meta;
type S = StoryObj<typeof Sidebar>;

const items = [
  { label: "Clips", icon: Film },
  { label: "Visuels", icon: Image },
  { label: "StreamScore", icon: BarChart3 },
  { label: "Réseaux", icon: Radio },
];

export const Navigation: S = {
  render: () => (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-3 py-2 text-sm font-semibold">Streamnco</SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Studio</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ label, icon: Icon }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton>
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="p-6">
        <SidebarTrigger />
        <p className="pt-4 text-sm text-muted-foreground">Contenu de la page.</p>
      </SidebarInset>
    </SidebarProvider>
  ),
  // Smoke : la navigation et ses items sont présents.
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Streamnco")).toBeInTheDocument();
    await expect(canvas.getByText("StreamScore")).toBeInTheDocument();
  },
};
