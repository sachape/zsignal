import type { Meta, StoryObj } from "@storybook/react-vite";
import { Hero, SectionTitle, Principles, Layers, LinkGrid } from "./getting-started/intro-sections";
import { TokenHierarchy, Pipeline, ContributionWorkflow, Governance } from "./getting-started/architecture-diagrams";

/**
 * Getting Started / Introduction — la porte d'entrée du Design System. Rendue en
 * STORY (canvas), pas en MDX docs : les composants gardent ainsi leurs couleurs
 * de tokens (la typographie des pages docs de Storybook écrasait les contrastes).
 */

function Introduction() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 p-8 md:p-12">
      <Hero />

      <section className="flex flex-col gap-6">
        <SectionTitle eyebrow="Vision" title="Une plateforme de qualité, pas un catalogue">
          Ce Design System ne se contente pas de lister des composants : il garantit leur qualité —
          tokens en source unique, accessibilité vérifiée à chaque commit, spacing audité automatiquement,
          régression visuelle sous contrôle, et un tableau de bord qui mesure tout, depuis le code réel.
        </SectionTitle>
      </section>

      <section className="flex flex-col gap-6">
        <SectionTitle eyebrow="Principes" title="Ce qui guide chaque décision" />
        <Principles />
      </section>

      <section className="flex flex-col gap-6">
        <SectionTitle eyebrow="Architecture" title="Des valeurs brutes à l'application">
          Les tokens sont la source unique de vérité, générés par Style Dictionary, consommés par les
          composants, composés en patterns et templates. Chaque étape est gouvernée.
        </SectionTitle>
        <div className="flex flex-col gap-6">
          <TokenHierarchy />
          <Pipeline />
          <ContributionWorkflow />
          <Governance />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <SectionTitle eyebrow="Couches" title="Comment naviguer">
          De la fondation la plus abstraite au composant produit le plus concret.
        </SectionTitle>
        <Layers />
      </section>

      <section className="flex flex-col gap-6">
        <SectionTitle eyebrow="Explorer" title="Points d'entrée" />
        <LinkGrid />
      </section>
    </div>
  );
}

const meta: Meta<typeof Introduction> = {
  title: "Getting Started/Introduction",
  component: Introduction,
  // Pas de page « Docs » auto (redondante ici) : on garde uniquement la story canvas.
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Introduction> = {};
