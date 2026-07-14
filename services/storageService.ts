"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase/client";

export const StorageService = {
  async uploadProductImage(companyId: string, storeId: string, productId: string, file: File) {
    if (!storage) throw new Error("Firebase Storage não configurado.");
    const extension = file.name.split(".").pop() ?? "jpg";
    const fileRef = ref(storage, `companies/${companyId}/stores/${storeId}/products/${productId}.${extension}`);
    await uploadBytes(fileRef, file, {
      contentType: file.type
    });
    return getDownloadURL(fileRef);
  },

  async uploadCompanyLogo(companyId: string, storeId: string, file: File) {
    if (!storage) throw new Error("Firebase Storage não configurado.");
    const extension = file.name.split(".").pop() ?? "png";
    const fileRef = ref(storage, `companies/${companyId}/stores/${storeId}/settings/logo.${extension}`);
    await uploadBytes(fileRef, file, {
      contentType: file.type
    });
    return getDownloadURL(fileRef);
  }
};
