"use client";

import { limit, orderBy, query, where, getDocs, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "@/firebase/client";
import { FirestoreRepository } from "@/services/firestoreRepository";
import type { Product } from "@/types/product";

function repository() {
  if (!db) throw new Error("Firebase não configurado.");
  return new FirestoreRepository<Product>(db, "products");
}

export const ProductService = {
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

  async findByBarcode(companyId: string, barcode: string) {
    if (!db) throw new Error("Firebase não configurado.");
    const snapshot = await getDocs(
      query(
        repository().collectionRef(),
        where("companyId", "==", companyId),
        where("barcode", "==", barcode),
        limit(1)
      )
    );
    const match = snapshot.docs.at(0);
    return match ? ({ id: match.id, ...match.data() } as Product) : null;
  },

  create(input: Omit<Product, "id" | "createdAt" | "updatedAt">) {
    return repository().create(input);
  },

  update(id: string, input: Partial<Omit<Product, "id" | "createdAt">>) {
    return repository().update(id, input);
  },

  async duplicate(product: Product, userId: string) {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...copy } = product;
    return repository().create({
      ...copy,
      name: `${product.name} (cópia)`,
      sku: `${product.sku}-copy`,
      createdBy: userId,
      updatedBy: userId
    });
  },

  async adjustStock(productId: string, quantity: number, userId: string) {
    if (!db) throw new Error("Firebase não configurado.");
    await runTransaction(db, async (transaction) => {
      const productRef = repository().docRef(productId);
      const snapshot = await transaction.get(productRef);
      if (!snapshot.exists()) throw new Error("Produto não encontrado.");
      const product = snapshot.data() as Product;
      transaction.update(productRef, {
        quantity,
        updatedBy: userId,
        updatedAt: serverTimestamp()
      });
    });
  }
};
