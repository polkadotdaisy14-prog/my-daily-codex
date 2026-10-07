import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase, isConfigured } from '../lib/supabase';

export interface CodexUser {
  id: string;
  email: string | null;
}

interface AuthContextValue {
  /** True in local beta mode (no Supabase env) — login is skipped entirely. */
  localMode: boolean;
  user: CodexUser | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOCAL_USER: CodexUser = { id: 'local', email: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const localMode = !isConfigured();
  const [user, setUser] = useState<CodexUser | null>(localMode ? LOCAL_USER : null);
  const [loading, setLoading] = useState(!localMode);

  useEffect(() => {
    if (localMode) return;
    const sb = getSupabase();
    let mounted = true;
    sb.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [localMode]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (localMode) return { error: null };
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      return { error: error ? error.message : null };
    },
    [localMode],
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string) => {
      if (localMode) return { error: null };
      const { error } = await getSupabase().auth.signUp({ email, password });
      return { error: error ? error.message : null };
    },
    [localMode],
  );

  const signInWithGoogle = useCallback(async () => {
    if (localMode) return { error: null };
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` },
    });
    return { error: error ? error.message : null };
  }, [localMode]);

  const signOut = useCallback(async () => {
    if (localMode) return;
    await getSupabase().auth.signOut();
  }, [localMode]);

  const value = useMemo<AuthContextValue>(
    () => ({
      localMode,
      user,
      loading,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      signOut,
    }),
    [localMode, user, loading, signInWithPassword, signUpWithPassword, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
