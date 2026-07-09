"use client";

import { limit, orderBy, where } from "firebase/firestore";
import { db } from "@/firebase/client";
import { FirestoreRepository } from "@/services/firestoreRepository";
import type { FinancialTransaction } from "@/types/finance";

function repository() {
  if (!db) throw new Error("Firebase não configurado.");
  return new FirestoreRepository<FinancialTransaction>(db, "financialTransactions");
}

export const FinanceService = {
  list(companyId: string) {
    return repository().listByCompany(companyId, [orderBy("dueAt", "desc"), limit(100)]);
  },

  listByType(companyId: string, type: FinancialTransaction["type"]) {
    return repository().listByCompany(companyId, [
      where("type", "==", type),
      orderBy("dueAt", "desc"),
      limit(100)
    ]);
  },

  create(input: Omit<FinancialTransaction, "id" | "createdAt" | "updatedAt">) {
    return repository().create(input);
  },

  update(id: string, input: Partial<Omit<FinancialTransaction, "id" | "createdAt">>) {
    return repository().update(id, input);
  }
};
