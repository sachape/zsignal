import type { Meta, StoryObj } from "@storybook/react-vite";
import { Hero, SectionTitle, Principles, NavGrid } from "./getting-started/intro-sections";
import { TokenHierarchy, Pipeline, ContributionWorkflow, Governance } from "./getting-started/architecture-diagrams";

/**
 * Getting Started / Introduction — porte d'entrée pensée comme un PARCOURS de
 * lecture : pourquoi → principes → architecture → workflow → ce qu'il contient →
 * gouvernance → contribution. Rendue en story (canvas) pour garder les couleurs.
 */

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span key={i} className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground">{i}</span>
      ))}
    </div>
  );
}
function Sec({ eyebrow, title, desc, children }: { eyebrow: string; title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <SectionTitle eyebrow={eyebrow} title={title}>{desc}</SectionTitle>
      {children}
    </section>
  );
}

function Introduction() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 p-8 md:p-12">
      <Hero />

      <Sec eyebrow="Explorer" title="Par où commencer"
        desc="Six portes d'entrée vers le système. Templates arrive plus tard, mais figure ici par cohérence avec l'architecture.">
        <NavGrid />
      </Sec>

      <Sec eyebrow="Pourquoi" title="Pourquoi ce Design System existe">
        Pour livrer vite sans sacrifier la qualité. Une source de vérité unique — tokens, composants,
        patterns — évite la dérive visuelle, garantit l'accessibilité, et rend chaque évolution mesurable
        et sûre. La qualité n'est pas une relecture finale : elle est vérifiée à chaque commit.
      </Sec>

      <Sec eyebrow="Principes" title="Ce qui guide chaque décision">
        <Principles />
      </Sec>

      <Sec eyebrow="Architecture" title="Comment le système est construit"
        desc="Tout descend d'une chaîne stricte de tokens — jamais l'inverse.">
        <TokenHierarchy />
      </Sec>

      <Sec eyebrow="Workflow" title="Du design au code"
        desc="Le même token voyage de Figma jusqu'à l'application, transformé par Style Dictionary.">
        <Pipeline />
      </Sec>

      <Sec eyebrow="Foundations" title="Les fondations"
        desc="Les décisions visuelles fondatrices — documentées, pas seulement celles consommées par l'app.">
        <Chips items={["Colors", "Typography", "Spacing", "Radius", "Motion", "Icons", "Grid", "Shadows", "Elevation", "Dark Mode", "Tokens"]} />
      </Sec>

      <Sec eyebrow="Components" title="Les composants"
        desc="Composants React réutilisables, rangés par usage.">
        <Chips items={["Actions", "Forms", "Feedback", "Overlays", "Navigation", "Content & Structure"]} />
      </Sec>

      <Sec eyebrow="Patterns" title="Les patterns"
        desc="Assemblages réutilisables de composants.">
        <Chips items={["FilterBar", "PageHeader", "SectionHeader", "Sidebar", "ProgressRow", "ScoreDisplay", "StateView"]} />
      </Sec>

      <Sec eyebrow="Gouvernance" title="Comment la qualité est tenue"
        desc="Des portes de qualité automatiques avant chaque merge.">
        <Governance />
      </Sec>

      <Sec eyebrow="Contribution" title="Comment contribuer"
        desc="Chaque changement suit le même chemin, de la PR au merge.">
        <ContributionWorkflow />
      </Sec>
    </div>
  );
}

const meta: Meta<typeof Introduction> = {
  title: "Getting Started/Introduction",
  component: Introduction,
  tags: ["!autodocs"],
  parameters: { layout: "fullscreen", controls: { disable: true } },
};
export default meta;
export const Overview: StoryObj<typeof Introduction> = {};
