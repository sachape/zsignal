import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { loadWatchlistFromDb } from "@/services/benchmarkWatchlist";
import { loadPreferredNicheFromDb } from "@/services/preferredNiche";
import { loadSeenBadgesFromDb } from "@/services/badgeEngine";
import { analytics } from "@/services/analytics";
import { sendWelcomeEmailOnce } from "@/services/welcomeEmail";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Renvoie le mail de confirmation d'inscription (compte créé mais non confirmé). */
  resendConfirmation: (email: string) => Promise<{ error: Error | null }>;
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
          void loadWatchlistFromDb(u.id);
          void loadPreferredNicheFromDb(u.id);
          void loadSeenBadgesFromDb(u.id);
          analytics.identifyUser(u.id, {
            email: u.email,
            name: (u.user_metadata?.full_name as string | undefined) ?? (u.user_metadata?.name as string | undefined),
            created_at: u.created_at,
          });
        }
        // Detect new signup on SIGNED_IN: created_at ≈ last_sign_in_at means
        // it's the very first authentication event for this account.
        if (event === "SIGNED_IN" && u?.email) {
          const trackKey = `streamnco:signup_tracked:${u.id}`;
          const emailKey = `streamnco:signup_tracked:email:${u.email}`;
          const method = (u.app_metadata?.provider as string | undefined) ?? "email";
          let isNewSignup = false;
          if (!localStorage.getItem(trackKey) && !localStorage.getItem(emailKey)) {
            const createdAt = new Date(u.created_at).getTime();
            const lastSignIn = new Date(u.last_sign_in_at ?? u.created_at).getTime();
            if (Math.abs(lastSignIn - createdAt) < 30_000) {
              isNewSignup = true;
              analytics.signupCompleted(method);
              localStorage.setItem(trackKey, "1");
            }
          }
          if (!isNewSignup) {
            analytics.signinCompleted(method);
          }
          // Send the branded welcome email exactly once per user.
          // Internally guarded against synthetic emails, duplicates, and reloads.
          void sendWelcomeEmailOnce(u);
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

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
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
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, resendConfirmation, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
