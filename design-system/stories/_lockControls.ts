// Helper partagé (cahier des charges §24) : verrouille les Controls des
// propriétés d'IDENTITÉ d'une story de référence — la valeur reste documentée
// (elle apparaît dans la table des props) mais n'est plus modifiable, donc une
// story « Secondary » ne peut plus devenir « Primary » via les Controls.
//
//   argTypes: lock("variant")            → variant non modifiable
//   argTypes: lock("loading", "disabled")→ les deux verrouillés
export const lock = (...keys: string[]): Record<string, { control: false }> =>
  Object.fromEntries(keys.map((k) => [k, { control: false as const }]));
