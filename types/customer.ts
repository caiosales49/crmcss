import type { Timestamp } from "firebase/firestore";
import type { Address, EntityStatus, TenantEntity } from "@/types/common";

export interface Customer extends TenantEntity {
  name: string;
  document?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: Address;
  notes?: string;
  totalSpent: number;
  lastPurchaseAt?: Timestamp;
  status: EntityStatus;
}
