import type { Timestamp } from "firebase/firestore";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export type SubscriptionPlan = "trial" | "starter" | "growth" | "scale";

export interface SubscriptionLimits {
  users: number;
  products: number;
  monthlySales: number;
  premiumModules: string[];
}

export interface Subscription {
  id: string;
  companyId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  trial: boolean;
  limits: SubscriptionLimits;
  expiresAt?: Timestamp;
  stripeCustomerId?: string;
  paymentProvider?: "stripe" | "mercadopago" | "manual";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function canUseSubscription(subscription?: Subscription | null) {
  return Boolean(
    subscription &&
      (subscription.status === "active" || subscription.status === "trialing")
  );
}
