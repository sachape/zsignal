import type { Meta, StoryObj } from "@storybook/react-vite";
import {
import { common, describe, CAT } from "./_argTypes";
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";

const meta: Meta<typeof Breadcrumb> = {
  title: "Components/Navigation/Breadcrumb",
  component: Breadcrumb,
  tags: ["autodocs"],
  argTypes: {
    ...common("children", "className"),
    separator: describe("Séparateur personnalisé entre les niveaux. Par défaut un chevron, masqué aux lecteurs d'écran.", { control: false, category: CAT.content }),
  },
  parameters: {
    layout: "centered",
    docs: { description: { component: "Breadcrumb — fil d'Ariane situant la page courante dans la hiérarchie. La page active est un `BreadcrumbPage` (non cliquable, `aria-current`) ; à réserver aux profondeurs > 2 niveaux." } },
  },
};
export default meta;
type S = StoryObj<typeof Breadcrumb>;

export const Default: S = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink href="#">Accueil</BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbLink href="#">Clips</BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbPage>Détail du clip</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

export const WithEllipsis: S = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem><BreadcrumbLink href="#">Accueil</BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem><BreadcrumbPage>Réglages</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};
