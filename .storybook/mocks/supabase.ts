// Mock du client Supabase pour Storybook. Aliasé sur @/integrations/supabase/client
// (voir .storybook/main.ts). But : que les composants et hooks qui tapent la base
// MONTENT sans crash ni appel réseau — ils reçoivent des réponses vides/sûres.

type Result = { data: unknown; error: null };

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
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
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
