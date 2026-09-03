/**
 * Garde-fou de démarrage.
 *
 * `src/integrations/supabase/client.ts` appelle `createClient` au chargement du
 * module : si les variables Vite sont absentes du build, il jette avant que
 * React ne monte. Le résultat est une page entièrement vide, sans erreur
 * visible — une panne totale et silencieuse, indistinguable d'un site lent.
 *
 * Ce module est importé AVANT `App` dans `main.tsx`, donc évalué avant la
 * chaîne qui jette. Il peint un message dans `#root` : l'exception qui suit
 * empêche React de monter, mais n'efface pas ce qui est déjà affiché.
 */
const REQUIRED: Record<string, string | undefined> = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};

const missing = Object.keys(REQUIRED).filter((key) => !REQUIRED[key]);

if (missing.length > 0) {
  console.error(
    `[bootstrap] Build incomplet : ${missing.join(", ")} absente(s). ` +
      "L'application ne peut pas démarrer.",
  );

  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f5f5f5;color:#0c0a09;font-family:Inter,system-ui,-apple-system,sans-serif">
        <div style="max-width:32rem;text-align:center">
          <p style="margin:0 0 12px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#756f67">Streamnco</p>
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;line-height:1.3">Le site est temporairement indisponible.</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4e4e4e">
            Une erreur de configuration empêche l'application de démarrer. Réessaie dans quelques minutes.
          </p>
          <p style="margin:0;font-size:12px;color:#756f67">
            Détail technique : build publié sans ${missing.join(", ")}.
          </p>
        </div>
      </div>`;
  }
}

export {};
