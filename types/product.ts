import type { Timestamp } from "firebase/firestore";
import type { EntityStatus, TenantEntity } from "@/types/common";

export type ProductUnit = "un" | "kg" | "g" | "l" | "ml" | "cx" | "pc";

export interface Product extends TenantEntity {
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  brand?: string;
  supplierId?: string;
  supplierName?: string;
  sku: string;
  internalCode?: string;
  barcode?: string;
  costPrice: number;
  salePrice: number;
  margin: number;
  quantity: number;
  minimumStock: number;
  imageUrl?: string;
  status: EntityStatus;
  unit: ProductUnit;
  lotTrackingEnabled: boolean;
  expiresAt?: Timestamp;
}

export interface Category extends TenantEntity {
  name: string;
  status: EntityStatus;
}

export interface Supplier extends TenantEntity {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  status: EntityStatus;
}
