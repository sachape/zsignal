import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Card — la primitive la plus utilisée (66×). Composée : Card + CardHeader +
 * CardTitle + CardDescription + CardContent + CardFooter. Surfaces via tokens.
 */
const meta: Meta<typeof Card> = {
  title: "Primitives/Card",
  component: Card,
  parameters: { layout: "centered" },
};
export default meta;
type S = StoryObj<typeof Card>;

export const Basique: S = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Dernier live</CardTitle>
        <CardDescription>Il y a 2 heures · 1 h 42</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        3 clips détectés, 2 visuels générés. StreamScore en hausse.
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Voir les clips</Button>
        <Button size="sm" variant="outline">Détail</Button>
      </CardFooter>
    </Card>
  ),
};

export const AvecBadge: S = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Plan Pro</CardTitle>
          <Badge variant="success">Actif</Badge>
        </div>
        <CardDescription>Renouvellement le 1er août</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Clips illimités, génération de visuels, StreamScore avancé.
      </CardContent>
    </Card>
  ),
};
