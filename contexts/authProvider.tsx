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

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateProfile = useCallback(async (currentUser: User | null) => {
    setUser(currentUser);
    if (!currentUser) {
      setProfile(null);
      setSubscription(null);
      setLoading(false);
      return;
    }

    const nextProfile = await AuthService.getProfile(currentUser.uid);
    setProfile(nextProfile);
    if (nextProfile) {
      setSubscription(await SubscriptionService.getByCompany(nextProfile.companyId));
    }
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
