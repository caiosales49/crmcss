"use client";

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/client";
import { canUseSubscription, type Subscription } from "@/types/subscription";

export const SubscriptionService = {
  async getByCompany(companyId: string) {
    if (!db) throw new Error("Firebase não configurado.");
    const snapshot = await getDoc(doc(db, "subscriptions", companyId));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Subscription) : null;
  },

  async assertAccess(companyId: string) {
    const subscription = await this.getByCompany(companyId);
    if (!canUseSubscription(subscription)) {
      throw new Error("Assinatura inativa. Regularize o plano para continuar.");
    }
    return subscription;
  },

  canUseModule(subscription: Subscription | null | undefined, module: string) {
    if (!canUseSubscription(subscription)) return false;
    const activeSubscription = subscription as Subscription;
    return activeSubscription.plan !== "trial" || activeSubscription.limits.premiumModules.includes(module);
  }
};
