"use client";

import {
  collection,
  doc,
  increment,
  limit,
  orderBy,
  query,
  where,
  getDocs,
  serverTimestamp,
  runTransaction,
  type DocumentData,
  type QueryDocumentSnapshot
} from "firebase/firestore";
import { db } from "@/firebase/client";
import { FirestoreRepository } from "@/services/firestoreRepository";
import type { Product } from "@/types/product";

function repository() {
  if (!db) throw new Error("Firebase não configurado.");
  return new FirestoreRepository<Product>(db, "products");
}

export const ProductService = {
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

  async findByBarcode(storeId: string, barcode: string) {
    if (!db) throw new Error("Firebase não configurado.");
    const snapshot = await getDocs(
      query(
        repository().collectionRef(),
        where("storeId", "==", storeId),
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

  delete(id: string) {
    return repository().delete(id);
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
  },

  async replenishStock(productId: string, quantity: number, userId: string) {
    if (!db) throw new Error("Firebase não configurado.");
    if (quantity <= 0) throw new Error("Informe uma quantidade maior que zero.");
    const firestore = db;

    await runTransaction(firestore, async (transaction) => {
      const productRef = repository().docRef(productId);
      const snapshot = await transaction.get(productRef);
      if (!snapshot.exists()) throw new Error("Produto não encontrado.");

      const product = snapshot.data() as Product;
      const nextQuantity = product.quantity + quantity;

      transaction.update(productRef, {
        quantity: increment(quantity),
        updatedBy: userId,
        updatedAt: serverTimestamp()
      });

      const movementRef = doc(collection(firestore, "inventoryMovements"));
      transaction.set(movementRef, {
        companyId: product.companyId,
        storeId: product.storeId,
        productId,
        productName: product.name,
        type: "in",
        quantity,
        previousQuantity: product.quantity,
        nextQuantity,
        reason: "Reposição de estoque",
        createdBy: userId,
        updatedBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
  }
};
