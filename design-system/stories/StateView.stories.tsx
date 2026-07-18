import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingState, ErrorState } from "@/components/StateView";
import { Button } from "@/components/ui/button";

/**
 * StateView — surfaces unifiées de chargement / erreur (16×). Garde l'UX des
 * états cohérente PARTOUT dans le produit : on ne réinvente pas un spinner ou un
 * message d'erreur par page. Chaque erreur dit quoi + (comment) via l'action.
 */
const meta: Meta = {
  title: "Patterns/StateView",
  parameters: { layout: "fullscreen" },
};
export default meta;
type S = StoryObj;

export const Chargement: S = {
  render: () => <LoadingState label="Chargement de tes clips…" />,
};

export const Erreur: S = {
  render: () => (
    <ErrorState
      title="Impossible de charger tes clips"
      description="La connexion à Twitch a expiré. Reconnecte-toi pour réessayer."
      action={<Button>Reconnecter Twitch</Button>}
    />
  ),
};
