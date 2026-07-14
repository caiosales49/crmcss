"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { User } from "firebase/auth";
import { AuthService } from "@/services/authService";
import type { UserProfile } from "@/types/company";
import type { Subscription } from "@/types/subscription";

const cachedAuthKey = "crm.auth.snapshot";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  subscription: Subscription | null;
  companyId?: string;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createAccountWithEmail: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function writeCachedAuth(snapshot: { profile: UserProfile | null; subscription: Subscription | null }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cachedAuthKey, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures; Firebase auth remains the source of truth.
  }
}

function clearCachedAuth() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(cachedAuthKey);
  } catch {
    // Ignore storage failures during logout/session refresh.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateProfile = useCallback(async (currentUser: User | null) => {
    setLoading(true);
    setUser(currentUser);
    if (!currentUser) {
      setProfile(null);
      setSubscription(null);
      clearCachedAuth();
      setLoading(false);
      return;
    }

    // A sessao do Firebase ja e suficiente para abrir a aplicacao. O perfil
    // pode ser sincronizado em segundo plano sem travar o login no mobile.
    setLoading(false);
    try {
      const nextProfile = await AuthService.upsertGoogleProfile(currentUser);
      setProfile(nextProfile);
      setSubscription(null);
      writeCachedAuth({ profile: nextProfile, subscription: null });
    } catch (error) {
      console.error("Falha ao atualizar sessão", error);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = AuthService.onAuthStateChanged((nextUser) => {
        void hydrateProfile(nextUser);
      });
    } catch {
      setLoading(false);
    }
    return () => unsubscribe?.();
  }, [hydrateProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      subscription,
      companyId: profile?.companyId,
      loading,
      signIn: async () => {
        await AuthService.signInWithGoogle();
        router.push("/dashboard");
      },
      signInWithEmail: async (email: string, password: string) => {
        await AuthService.signInWithEmail(email, password);
        router.push("/dashboard");
      },
      createAccountWithEmail: async (input: { name: string; email: string; password: string }) => {
        await AuthService.createAccountWithEmail(input);
        router.push("/create-store");
      },
      logout: async () => {
        await AuthService.logout();
        clearCachedAuth();
        router.push("/login");
      }
    }),
    [hydrateProfile, loading, profile, router, subscription, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}
