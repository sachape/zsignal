import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { loadWatchlistFromDb } from "@/services/benchmarkWatchlist";
import { loadPreferredNicheFromDb } from "@/services/preferredNiche";
import { loadSeenBadgesFromDb } from "@/services/badgeEngine";
import { analytics } from "@/services/analytics";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        const u = session?.user;
        if (u?.id) {
          // Hydrate per-user caches (fire-and-forget)
          void loadWatchlistFromDb(u.id);
          void loadPreferredNicheFromDb(u.id);
          void loadSeenBadgesFromDb(u.id);
        }
        // Detect new signup on SIGNED_IN: created_at ≈ last_sign_in_at means
        // it's the very first authentication event for this account.
        if (event === "SIGNED_IN" && u?.email) {
          const trackKey = `streamnco:signup_tracked:${u.id}`;
          const emailKey = `streamnco:signup_tracked:email:${u.email}`;
          if (!localStorage.getItem(trackKey) && !localStorage.getItem(emailKey)) {
            const createdAt = new Date(u.created_at).getTime();
            const lastSignIn = new Date(u.last_sign_in_at ?? u.created_at).getTime();
            if (Math.abs(lastSignIn - createdAt) < 30_000) {
              analytics.identify(u.email);
              analytics.signupCompleted(u.email);
              localStorage.setItem(trackKey, "1");
            }
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      const uid = session?.user?.id;
      if (uid) {
        void loadWatchlistFromDb(uid);
        void loadPreferredNicheFromDb(uid);
        void loadSeenBadgesFromDb(uid);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const deleteAccount = async (): Promise<{ error: Error | null }> => {
    const { error } = await supabase.rpc("delete_user");
    if (error) return { error: error as Error };
    await supabase.auth.signOut();
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
