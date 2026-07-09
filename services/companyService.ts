"use client";

import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/client";
import type { Company } from "@/types/company";

export const CompanyService = {
  async get(companyId: string) {
    if (!db) throw new Error("Firebase não configurado.");
    const snapshot = await getDoc(doc(db, "companies", companyId));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Company) : null;
  },

  async update(companyId: string, input: Partial<Omit<Company, "id" | "createdAt">>) {
    if (!db) throw new Error("Firebase não configurado.");
    await updateDoc(doc(db, "companies", companyId), {
      ...input,
      updatedAt: serverTimestamp()
    });
  }
};
