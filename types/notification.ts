import type { TenantEntity } from "@/types/common";

export type NotificationType =
  | "low_stock"
  | "subscription_expiring"
  | "payment_overdue"
  | "new_sale";

export interface Notification extends TenantEntity {
  type: NotificationType;
  title: string;
  description: string;
  read: boolean;
  actionUrl?: string;
}
