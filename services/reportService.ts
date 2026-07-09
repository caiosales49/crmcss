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
  request(companyId: string, createdBy: string, type: ReportType, format: ExportFormat) {
    return repository().create({
      companyId,
      createdBy,
      updatedBy: createdBy,
      type,
      format,
      status: "queued",
      requestedAt: Timestamp.now()
    });
  },

  list(companyId: string) {
    return repository().listRecent(companyId, "requestedAt", 50);
  }
};
