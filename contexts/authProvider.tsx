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
import { SubscriptionService } from "@/services/subscriptionService";
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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface CachedAuthSnapshot {
  profile: UserProfile | null;
  subscription: Subscription | null;
}

function readCachedAuth() {
  if (typeof window === "undefined") return null;
  try {
    const cached = window.localStorage.getItem(cachedAuthKey);
    return cached ? (JSON.parse(cached) as CachedAuthSnapshot) : null;
  } catch {
    return null;
  }
}

function writeCachedAuth(snapshot: CachedAuthSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(cachedAuthKey, JSON.stringify(snapshot));
}

function clearCachedAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(cachedAuthKey);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => readCachedAuth()?.profile ?? null);
  const [subscription, setSubscription] = useState<Subscription | null>(
    () => readCachedAuth()?.subscription ?? null
  );
  const [loading, setLoading] = useState(true);

  const hydrateProfile = useCallback(async (currentUser: User | null) => {
    setUser(currentUser);
    if (!currentUser) {
      setProfile(null);
      setSubscription(null);
      clearCachedAuth();
      setLoading(false);
      return;
    }

    const nextProfile = await AuthService.getProfile(currentUser.uid);
    setProfile(nextProfile);
    let nextSubscription: Subscription | null = null;
    if (nextProfile) {
      nextSubscription = await SubscriptionService.getByCompany(nextProfile.companyId);
    }
    setSubscription(nextSubscription);
    writeCachedAuth({ profile: nextProfile, subscription: nextSubscription });
    setLoading(false);
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
        const signedUser = await AuthService.signInWithGoogle();
        await hydrateProfile(signedUser);
        router.push("/dashboard");
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
