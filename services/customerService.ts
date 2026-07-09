"use client";

import { limit, orderBy, where } from "firebase/firestore";
import { db } from "@/firebase/client";
import { FirestoreRepository } from "@/services/firestoreRepository";
import type { Customer } from "@/types/customer";

function repository() {
  if (!db) throw new Error("Firebase não configurado.");
  return new FirestoreRepository<Customer>(db, "customers");
}

export const CustomerService = {
  list(companyId: string) {
    return repository().listByCompany(companyId, [orderBy("name", "asc"), limit(100)]);
  },

  search(companyId: string, term: string) {
    const normalized = term.trim();
    if (!normalized) return this.list(companyId);
    return repository().listByCompany(companyId, [
      where("name", ">=", normalized),
      where("name", "<=", `${normalized}\uf8ff`),
      limit(25)
    ]);
  },

  create(input: Omit<Customer, "id" | "createdAt" | "updatedAt">) {
    return repository().create(input);
  },

  update(id: string, input: Partial<Omit<Customer, "id" | "createdAt">>) {
    return repository().update(id, input);
  }
};
