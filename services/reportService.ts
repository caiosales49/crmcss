"use client";

import { Timestamp } from "firebase/firestore";
import { db } from "@/firebase/client";
import { FirestoreRepository } from "@/services/firestoreRepository";
import type { ExportFormat, ReportJob, ReportType } from "@/types/report";

function repository() {
  if (!db) throw new Error("Firebase não configurado.");
  return new FirestoreRepository<ReportJob>(db, "reports");
}

export const ReportService = {
  request(companyId: string, storeId: string, createdBy: string, type: ReportType, format: ExportFormat) {
    return repository().create({
      companyId,
      storeId,
      createdBy,
      updatedBy: createdBy,
      type,
      format,
      status: "queued",
      requestedAt: Timestamp.now()
    });
  },

  list(storeId: string) {
    return repository().listRecentByStore(storeId, "requestedAt", 50);
  }
};
