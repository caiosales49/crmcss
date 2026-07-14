"use client";

import { limit, orderBy, where } from "firebase/firestore";
import { db } from "@/firebase/client";
import { FirestoreRepository } from "@/services/firestoreRepository";
import type { FinancialTransaction } from "@/types/finance";
import { SaleService } from "@/services/saleService";
import type { Sale } from "@/types/sale";
import type { FinancePeriodRange } from "@/types/finance";

function repository() {
  if (!db) throw new Error("Firebase não configurado.");
  return new FirestoreRepository<FinancialTransaction>(db, "financialTransactions");
}

export const FinanceService = {
  list(storeId: string) {
    return repository().listByStore(storeId, [orderBy("dueAt", "desc"), limit(100)]);
  },

  async listPaidInPeriod(storeId: string, startDate: Date, endDate: Date) {
    const [byPaidAt, byDueAt] = await Promise.all([
      repository().listByStore(storeId, [
        where("status", "==", "paid"),
        where("paidAt", ">=", startDate),
        where("paidAt", "<=", endDate),
        orderBy("paidAt", "desc"),
        limit(500)
      ]),
      repository().listByStore(storeId, [
        where("status", "==", "paid"),
        where("dueAt", ">=", startDate),
        where("dueAt", "<=", endDate),
        orderBy("dueAt", "desc"),
        limit(500)
      ])
    ]);
    const transactions = new Map<string, FinancialTransaction>();
    for (const item of [...byPaidAt, ...byDueAt]) {
      const date = item.paidAt ?? item.dueAt;
      const time = date.toMillis();
      if (time >= startDate.getTime() && time <= endDate.getTime()) {
        transactions.set(item.id, item);
      }
    }
    return Array.from(transactions.values());
  },

  listByType(storeId: string, type: FinancialTransaction["type"]) {
    return repository().listByStore(storeId, [
      where("type", "==", type),
      orderBy("dueAt", "desc"),
      limit(100)
    ]);
  },

  async listInPeriod(storeId: string, period: FinancePeriodRange) {
    const [byDueAt, byPaidAt] = await Promise.all([
      repository().listByStore(storeId, [
        where("dueAt", ">=", period.startDate),
        where("dueAt", "<=", period.endDate),
        orderBy("dueAt", "desc"),
        limit(500)
      ]),
      repository().listByStore(storeId, [
        where("status", "==", "paid"),
        where("paidAt", ">=", period.startDate),
        where("paidAt", "<=", period.endDate),
        orderBy("paidAt", "desc"),
        limit(500)
      ])
    ]);
    const items = new Map<string, FinancialTransaction>();
    for (const item of [...byDueAt, ...byPaidAt]) {
      if (item.active !== false) items.set(item.id, item);
    }
    return Array.from(items.values());
  },

  listSalesInPeriod(storeId: string, period: FinancePeriodRange): Promise<Sale[]> {
    return SaleService.listPaidInPeriod(storeId, period.startDate, period.endDate);
  },

  create(input: Omit<FinancialTransaction, "id" | "createdAt" | "updatedAt">) {
    return repository().create(input);
  },

  update(id: string, input: Partial<Omit<FinancialTransaction, "id" | "createdAt">>) {
    return repository().update(id, input);
  }
};
