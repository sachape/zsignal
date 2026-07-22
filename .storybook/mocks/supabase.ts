// Mock du client Supabase pour Storybook. Aliasé sur @/integrations/supabase/client
// (voir .storybook/main.ts). But : que les composants et hooks qui tapent la base
// MONTENT sans crash ni appel réseau — ils reçoivent des réponses vides/sûres.

type Result = { data: unknown; error: null };

// Storybook ne présente QUE le produit réel (connecté), jamais le site marketing.
// Sans session, AuthProvider laisse `user = null` et les composants à double état
// (ex. AppShell) tombent sur leur fallback public/marketing — ce qu'on ne veut pas
// voir dans le catalogue. On monte donc une session mockée « connectée ».
// NB : cette session est renvoyée par getSession/getUser mais l'event SIGNED_IN
// n'est JAMAIS émis (onAuthStateChange reste un no-op) → aucun effet de bord
// d'onboarding (email de bienvenue, analytics signup). Les seuls appels déclenchés
// (loadWatchlistFromDb…) passent par ce mock et renvoient du vide.
const MOCK_USER: any = {
  id: "storybook-user",
  aud: "authenticated",
  role: "authenticated",
  email: "demo@streamnco.fr",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "Demo Streamer", name: "Demo Streamer", avatar_url: "" },
  created_at: "2026-01-01T00:00:00.000Z",
  last_sign_in_at: "2026-01-01T00:00:00.000Z",
};
const MOCK_SESSION: any = {
  user: MOCK_USER,
  access_token: "storybook",
  refresh_token: "storybook",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 9999999999,
};

// Query-builder chaînable ET thenable : supabase.from("t").select().eq(...).order(...)
// renvoie toujours la même chaîne, et `await` résout `{ data: [], error: null }`.
function chain(result: Result): any {
  const p = Promise.resolve(result);
  return new Proxy(function () {} as any, {
    get(_t, prop) {
      if (prop === "then") return p.then.bind(p);
      if (prop === "catch") return p.catch.bind(p);
      if (prop === "finally") return p.finally.bind(p);
      if (prop === "single" || prop === "maybeSingle")
        return () => chain({ data: null, error: null });
      return () => chain(result);
    },
    apply() {
      return chain(result);
    },
  });
}

export const supabase: any = {
  auth: {
    getSession: async () => ({ data: { session: MOCK_SESSION }, error: null }),
    getUser: async () => ({ data: { user: MOCK_USER }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signUp: async () => ({ data: {}, error: null }),
    signInWithPassword: async () => ({ data: {}, error: null }),
    signInWithOAuth: async () => ({ data: {}, error: null }),
    signOut: async () => ({ error: null }),
    updateUser: async () => ({ data: {}, error: null }),
  },
  rpc: () => chain({ data: null, error: null }),
  from: () => chain({ data: [], error: null }),
  channel: () => ({
    on() {
      return this;
    },
    subscribe() {
      return this;
    },
    unsubscribe() {},
  }),
  removeChannel: () => {},
  functions: { invoke: async () => ({ data: null, error: null }) },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
      remove: async () => ({ data: null, error: null }),
    }),
  },
};

export default supabase;
