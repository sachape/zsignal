import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup,
  SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarInset, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Clapperboard, Palette, Activity, Users, TrendingUp, BookOpen,
} from "lucide-react";
import { common, prop, CAT } from "./_argTypes";

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
    side: prop("Bord de l'écran où s'ancre la navigation.", { control: "inline-radio", options: ["left", "right"], category: CAT.layout, defaultValue: "left" }),
    variant: prop("`sidebar` collée au bord, `floating` détachée en carte, `inset` encastrée dans le contenu.", { control: "inline-radio", options: ["sidebar", "floating", "inset"], defaultValue: "sidebar" }),
    collapsible: prop("Comportement replié : `icon` garde les icônes visibles, `offcanvas` sort de l'écran, `none` interdit le repli.", { control: "inline-radio", options: ["offcanvas", "icon", "none"], category: CAT.state, defaultValue: "offcanvas" }),
  },
  parameters: { docs: { description: { component: "Sidebar — la navigation verticale de l'app (produit complexe, 5–20 items groupés). Nécessite SidebarProvider (contexte ouvert/replié)." } },  layout: "fullscreen" },
};
export default meta;
type S = StoryObj<typeof Sidebar>;

// Reflète la navigation réelle de l'app (`navGroups` dans AppSidebar). Storybook
// sert de référence pour l'architecture de l'information : à mettre à jour quand
// l'IA produit bouge. Un groupe sans libellé porte les entrées de premier niveau.
const navGroups = [
  { items: [{ label: "Tableau de bord", icon: LayoutDashboard }] },
  {
    label: "Créer",
    items: [
      { label: "Clipping", icon: Clapperboard },
      { label: "Studio visuel", icon: Palette },
    ],
  },
  {
    label: "Analyser",
    items: [
      { label: "StreamScore", icon: Activity },
      { label: "Benchmark", icon: Users },
      { label: "Progression", icon: TrendingUp },
    ],
  },
  {
    label: "Apprendre",
    items: [{ label: "Ressources", icon: BookOpen }],
  },
];

export const Navigation: S = {
  render: () => (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-3 py-2 text-sm font-semibold">Streamnco</SidebarHeader>
        <SidebarContent>
          {navGroups.map((group, gi) => (
            <SidebarGroup key={group.label ?? `g-${gi}`}>
              {group.label && (
                // Même traitement typographique que le produit (AppSidebar).
                <SidebarGroupLabel className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(({ label, icon: Icon }) => (
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
          ))}
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="p-6">
        <SidebarTrigger />
        <p className="pt-4 text-sm text-muted-foreground">Contenu de la page.</p>
      </SidebarInset>
    </SidebarProvider>
  ),
  // Smoke : la navigation, ses groupes et ses items sont présents.
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Streamnco")).toBeInTheDocument();
    await expect(canvas.getByText("StreamScore")).toBeInTheDocument();

    // Aucun groupe orphelin : chaque item d'un groupe nommé est sous son libellé.
    for (const label of ["Créer", "Analyser", "Apprendre"]) {
      await expect(canvas.getByText(label)).toBeInTheDocument();
    }
    await expect(canvas.getByText("Ressources")).toBeInTheDocument();

    // Entrées retirées du produit : elles ne doivent pas réapparaître ici.
    for (const removed of ["Réseaux", "Live Studio"]) {
      await expect(canvas.queryByText(removed)).toBeNull();
    }
  },
};
