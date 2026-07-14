"use client";

import { limit, orderBy, where, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/firebase/client";
import { FirestoreRepository } from "@/services/firestoreRepository";
import type { Customer } from "@/types/customer";

function repository() {
  if (!db) throw new Error("Firebase não configurado.");
  return new FirestoreRepository<Customer>(db, "customers");
}

export const CustomerService = {
  list(storeId: string) {
    return repository().listByStore(storeId, [orderBy("name", "asc"), limit(100)]);
  },

  listPage(storeId: string, cursor?: QueryDocumentSnapshot<DocumentData> | null) {
    return repository().pageByStore(storeId, [orderBy("name", "asc")], 25, cursor);
  },

  search(storeId: string, term: string) {
    const normalized = term.trim();
    if (!normalized) return this.list(storeId);
    return repository().listByStore(storeId, [
      where("name", ">=", normalized),
      where("name", "<=", `${normalized}\uf8ff`),
      limit(25)
    ]);
  },

  searchPage(storeId: string, term: string, cursor?: QueryDocumentSnapshot<DocumentData> | null) {
    const normalized = term.trim();
    if (!normalized) return this.listPage(storeId, cursor);
    return repository().pageByStore(storeId, [
      orderBy("name", "asc"),
      where("name", ">=", normalized),
      where("name", "<=", `${normalized}\uf8ff`)
    ], 25, cursor);
  },

  create(input: Omit<Customer, "id" | "createdAt" | "updatedAt">) {
    return repository().create(input);
  },

  update(id: string, input: Partial<Omit<Customer, "id" | "createdAt">>) {
    return repository().update(id, input);
  }
};
