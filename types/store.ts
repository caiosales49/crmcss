import type { Timestamp } from "firebase/firestore";
import type { EntityStatus } from "@/types/common";

export type StoreRole = "owner" | "manager" | "employee";
export type StoreMemberStatus = "active" | "blocked";
export type InvitationStatus = "pending" | "accepted" | "revoked";

export interface Store {
  id: string;
  companyId: string;
  accountId?: string;
  accountStatus?: "active" | "suspended";
  name: string;
  nome?: string;
  document?: string | null;
  documentType?: "cpf" | "cnpj" | null;
  ownerId: string;
  ownerEmail: string;
  status: EntityStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StoreMember {
  id: string;
  companyId: string;
  accountId?: string;
  accountStatus?: "active" | "suspended";
  storeId: string;
  userId?: string;
  email: string;
  role: StoreRole;
  status: StoreMemberStatus;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface StoreInvitation {
  id: string;
  email: string;
  companyId: string;
  storeId: string;
  role: Exclude<StoreRole, "owner">;
  status: InvitationStatus;
  invitedBy: string;
  userId: string | null;
  createdAt: Timestamp;
  acceptedAt: Timestamp | null;
}
