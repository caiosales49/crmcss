import type { Timestamp } from "firebase/firestore";
import type { TenantEntity } from "@/types/common";

export type ReportType =
  | "products"
  | "inventory"
  | "movements"
  | "customers"
  | "sales"
  | "finance"
  | "profit"
  | "top_products"
  | "margin"
  | "cash_flow";

export type ExportFormat = "pdf" | "xlsx" | "csv";

export interface ReportJob extends TenantEntity {
  type: ReportType;
  format: ExportFormat;
  status: "queued" | "processing" | "done" | "failed";
  fileUrl?: string;
  requestedAt: Timestamp;
}
