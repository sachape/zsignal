import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup,
  SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarInset, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Film, Image, BarChart3, Radio } from "lucide-react";
import { common, describe, CAT } from "./_argTypes";

/**
 * Sidebar — la navigation verticale de l'app (produit complexe, 5–20 items
 * groupés). Nécessite SidebarProvider (contexte ouvert/replié). Même fond que le
 * contenu + bordure : on ne fragmente pas l'espace (cf. Subtle Layering).
 */
const meta: Meta<typeof Sidebar> = {
  title: "Patterns/Sidebar",
  component: Sidebar,
  argTypes: {
    ...common("children", "className"),
    side: describe("Bord de l'écran où s'ancre la navigation.", { control: "inline-radio", options: ["left", "right"], category: CAT.layout, defaultValue: "left" }),
    variant: describe("`sidebar` collée au bord, `floating` détachée en carte, `inset` encastrée dans le contenu.", { control: "inline-radio", options: ["sidebar", "floating", "inset"], defaultValue: "sidebar" }),
    collapsible: describe("Comportement replié : `icon` garde les icônes visibles, `offcanvas` sort de l'écran, `none` interdit le repli.", { control: "inline-radio", options: ["offcanvas", "icon", "none"], category: CAT.state, defaultValue: "offcanvas" }),
  },
  parameters: { docs: { description: { component: "Sidebar — la navigation verticale de l'app (produit complexe, 5–20 items groupés). Nécessite SidebarProvider (contexte ouvert/replié)." } },  layout: "fullscreen" },
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
