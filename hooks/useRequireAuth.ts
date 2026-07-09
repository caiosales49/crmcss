"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/authProvider";
import { canUseSubscription } from "@/types/subscription";

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) {
      router.replace("/login");
      return;
    }
    if (!canUseSubscription(auth.subscription)) {
      router.replace("/settings?tab=subscription");
    }
  }, [auth.loading, auth.subscription, auth.user, router]);

  return auth;
}
