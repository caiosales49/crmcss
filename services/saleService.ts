"use client";

import {
  collection,
  doc,
  increment,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  where
} from "firebase/firestore";
import { db } from "@/firebase/client";
import { FirestoreRepository } from "@/services/firestoreRepository";
import type { Product } from "@/types/product";
import type { Sale } from "@/types/sale";

function repository() {
  if (!db) throw new Error("Firebase não configurado.");
  return new FirestoreRepository<Sale>(db, "sales");
}

export const SaleService = {
  list(storeId: string) {
    return repository().listByStore(storeId, [orderBy("createdAt", "desc"), limit(100)]);
  },

  listPaidInPeriod(storeId: string, startDate: Date, endDate: Date) {
    return repository().listByStore(storeId, [
      where("status", "==", "paid"),
      where("createdAt", ">=", startDate),
      where("createdAt", "<=", endDate),
      orderBy("createdAt", "desc"),
      limit(500)
    ]);
  },

  async finalize(input: Omit<Sale, "id" | "createdAt" | "updatedAt">) {
    if (!db) throw new Error("Firebase não configurado.");
    const firestore = db;
    const saleRef = doc(collection(firestore, "sales"));

    await runTransaction(firestore, async (transaction) => {
      for (const item of input.items) {
        const productRef = doc(firestore, "products", item.productId);
        const productSnapshot = await transaction.get(productRef);
        if (!productSnapshot.exists()) {
          throw new Error(`Produto ${item.name} não encontrado.`);
        }

        const product = productSnapshot.data() as Product;
        if (product.companyId !== input.companyId || product.storeId !== input.storeId) {
          throw new Error("Produto pertence a outra loja.");
        }
        if (product.quantity < item.quantity) {
          throw new Error(`Estoque insuficiente para ${item.name}.`);
        }

        transaction.update(productRef, {
          quantity: increment(-item.quantity),
          updatedAt: serverTimestamp(),
          updatedBy: input.createdBy
        });

        const movementRef = doc(collection(firestore, "inventoryMovements"));
        transaction.set(movementRef, {
          companyId: input.companyId,
          storeId: input.storeId,
          productId: item.productId,
          productName: item.name,
          type: "out",
          quantity: item.quantity,
          previousQuantity: product.quantity,
          nextQuantity: product.quantity - item.quantity,
          saleId: saleRef.id,
          reason: "Venda finalizada",
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      transaction.set(saleRef, {
        ...input,
        status: "paid",
        paidAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    return saleRef.id;
  }
};
