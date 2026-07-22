// Vocabulaire partagé des Controls — une prop, une description, partout pareil.
//
// Le panneau Controls de Storybook n'affiche sa colonne « Description » que si
// les argTypes en portent une. Or nos composants sont majoritairement des
// `React.ComponentPropsWithoutRef<typeof RadixPrimitive>` : react-docgen ne sait
// pas les résoudre et n'extrait donc RIEN automatiquement (contrairement à un DS
// dont les props sont déclarées en local). Les descriptions doivent être écrites.
//
// Les écrire 45 fois, c'est garantir 45 formulations divergentes pour `open` ou
// `disabled`. Ce module est la source unique : une story compose le vocabulaire
// commun puis ajoute ce qui lui est spécifique.
//
//   argTypes: { ...common("open", "onOpenChange"), variant: { … } }
//
// Les catégories (`table.category`) regroupent les lignes du panneau : State,
// Content, Appearance, Layout, Events, Advanced. Même ordre partout.

type ArgType = {
  control?: unknown;
  description?: string;
  options?: readonly unknown[];
  table?: { category?: string; defaultValue?: { summary: string }; type?: { summary: string } };
};

/** Catégories d'affichage — un seul jeu, pour que le panneau se lise pareil partout. */
export const CAT = {
  content: "Content",
  state: "State",
  appearance: "Appearance",
  layout: "Layout",
  events: "Events",
  advanced: "Advanced",
} as const;

// Vocabulaire commun. Décrit l'INTENTION de la prop, pas son type (le type est
// déjà affiché par Storybook) — « à quoi ça sert », pas « c'est un booléen ».
const VOCAB = {
  // ── État ────────────────────────────────────────────────────────────────
  open: { control: "boolean", description: "Ouvre ou ferme le composant. Contrôlé : à piloter avec `onOpenChange`.", table: { category: CAT.state } },
  defaultOpen: { control: "boolean", description: "État d'ouverture initial, en mode non contrôlé.", table: { category: CAT.state } },
  disabled: { control: "boolean", description: "Désactive toute interaction. L'élément reste lisible mais n'est plus focusable.", table: { category: CAT.state } },
  required: { control: "boolean", description: "Marque le champ comme obligatoire pour la validation et les lecteurs d'écran.", table: { category: CAT.state } },
  checked: { control: "boolean", description: "État coché. Contrôlé : à piloter avec `onCheckedChange`.", table: { category: CAT.state } },
  value: { control: "text", description: "Valeur courante. Contrôlé : à piloter avec `onValueChange`.", table: { category: CAT.state } },
  defaultValue: { control: "text", description: "Valeur initiale, en mode non contrôlé.", table: { category: CAT.state } },
  name: { control: "text", description: "Nom du champ dans les données du formulaire.", table: { category: CAT.state } },

  // ── Contenu ─────────────────────────────────────────────────────────────
  children: { control: false, description: "Contenu du composant.", table: { category: CAT.content } },
  placeholder: { control: "text", description: "Exemple de format attendu — jamais un substitut au label.", table: { category: CAT.content } },

  // ── Apparence / disposition ─────────────────────────────────────────────
  orientation: { control: "inline-radio", options: ["horizontal", "vertical"], description: "Axe de disposition. Détermine aussi la navigation au clavier.", table: { category: CAT.layout } },
  side: { control: "select", options: ["top", "right", "bottom", "left"], description: "Côté de l'ancre où s'affiche le flottant, si la place le permet.", table: { category: CAT.layout } },
  align: { control: "inline-radio", options: ["start", "center", "end"], description: "Alignement le long du côté choisi.", table: { category: CAT.layout } },
  sideOffset: { control: "number", description: "Écart en pixels entre l'ancre et le flottant.", table: { category: CAT.layout } },
  className: { control: false, description: "Classes utilitaires additionnelles. Réservé à la composition — ne pas s'en servir pour contourner les tokens.", table: { category: CAT.advanced } },

  // ── Événements ──────────────────────────────────────────────────────────
  onOpenChange: { control: false, description: "Appelé à chaque ouverture ou fermeture.", table: { category: CAT.events } },
  onValueChange: { control: false, description: "Appelé quand la valeur change.", table: { category: CAT.events } },
  onCheckedChange: { control: false, description: "Appelé quand l'état coché change.", table: { category: CAT.events } },
  onClick: { control: false, description: "Callback à l'activation.", table: { category: CAT.events } },

  // ── Avancé ──────────────────────────────────────────────────────────────
  asChild: { control: false, description: "Rend l'enfant comme élément racine (Slot) au lieu d'ajouter une balise. Composition avancée.", table: { category: CAT.advanced } },
  modal: { control: "boolean", description: "Rend le reste de la page inerte tant que le composant est ouvert.", table: { category: CAT.advanced } },
} satisfies Record<string, ArgType>;

export type CommonProp = keyof typeof VOCAB;

/**
 * Compose le vocabulaire commun pour les props demandées.
 * `common("open", "disabled")` → argTypes prêts à étaler.
 */
export function common(...keys: CommonProp[]): Record<string, ArgType> {
  return Object.fromEntries(keys.map((k) => [k, VOCAB[k]]));
}

/** Décrit une prop spécifique à un composant, sans réécrire la forme à chaque fois. */
export function describe(
  description: string,
  opts: { control?: unknown; options?: readonly unknown[]; category?: string; defaultValue?: string } = {},
): ArgType {
  const { control, options, category = CAT.appearance, defaultValue } = opts;
  return {
    ...(control !== undefined ? { control } : {}),
    ...(options ? { options } : {}),
    description,
    table: { category, ...(defaultValue ? { defaultValue: { summary: defaultValue } } : {}) },
  };
}
