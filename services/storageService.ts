"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase/client";

export const StorageService = {
  async uploadProductImage(companyId: string, productId: string, file: File) {
    if (!storage) throw new Error("Firebase Storage não configurado.");
    const extension = file.name.split(".").pop() ?? "jpg";
    const fileRef = ref(storage, `companies/${companyId}/products/${productId}.${extension}`);
    await uploadBytes(fileRef, file, {
      contentType: file.type
    });
    return getDownloadURL(fileRef);
  },

  async uploadCompanyLogo(companyId: string, file: File) {
    if (!storage) throw new Error("Firebase Storage não configurado.");
    const extension = file.name.split(".").pop() ?? "png";
    const fileRef = ref(storage, `companies/${companyId}/settings/logo.${extension}`);
    await uploadBytes(fileRef, file, {
      contentType: file.type
    });
    return getDownloadURL(fileRef);
  }
};
