"use client";

import { orderBy, limit } from "firebase/firestore";
import { db } from "@/firebase/client";
import { FirestoreRepository } from "@/services/firestoreRepository";
import type { InventoryMovement } from "@/types/inventory";

function repository() {
  if (!db) throw new Error("Firebase não configurado.");
  return new FirestoreRepository<InventoryMovement>(db, "inventoryMovements");
}

export const InventoryService = {
  listMovements(storeId: string) {
    return repository().listByStore(storeId, [orderBy("createdAt", "desc"), limit(100)]);
  },

  createMovement(input: Omit<InventoryMovement, "id" | "createdAt" | "updatedAt">) {
    return repository().create(input);
  }
};
