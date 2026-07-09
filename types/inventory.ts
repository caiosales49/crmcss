import type { Timestamp } from "firebase/firestore";
import type { TenantEntity } from "@/types/common";

export type InventoryMovementType =
  | "in"
  | "out"
  | "adjustment"
  | "loss"
  | "exchange"
  | "return";

export interface InventoryMovement extends TenantEntity {
  productId: string;
  productName: string;
  type: InventoryMovementType;
  quantity: number;
  previousQuantity: number;
  nextQuantity: number;
  reason?: string;
  saleId?: string;
  lot?: string;
  expiresAt?: Timestamp;
}
