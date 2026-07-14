import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();

const db = getFirestore();

export const onLowStockMovement = onDocumentCreated(
  "inventoryMovements/{movementId}",
  async (event) => {
    const movement = event.data?.data();
    if (!movement || movement.type !== "out") return;

    const productRef = db.collection("products").doc(String(movement.productId));
    const productSnapshot = await productRef.get();
    if (!productSnapshot.exists) return;

    const product = productSnapshot.data();
    if (!product) return;

    const quantity = Number(product.quantity ?? 0);
    const minimumStock = Number(product.minimumStock ?? 0);
    if (quantity > minimumStock) return;

    await db.collection("notifications").add({
      companyId: product.companyId,
      storeId: product.storeId,
      type: "low_stock",
      title: "Estoque baixo",
      description: `${product.name} chegou ao estoque mínimo.`,
      read: false,
      actionUrl: "/products",
      createdBy: movement.createdBy,
      updatedBy: movement.createdBy,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  }
);

export const expireTrials = onSchedule("every day 03:00", async () => {
  const now = new Date();
  const snapshot = await db
    .collection("subscriptions")
    .where("status", "==", "trialing")
    .where("expiresAt", "<=", now)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((document) => {
    batch.update(document.ref, {
      status: "expired",
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  await batch.commit();
});

export const processReportQueue = onSchedule("every 5 minutes", async () => {
  const queued = await db
    .collection("reports")
    .where("status", "==", "queued")
    .limit(10)
    .get();

  const batch = db.batch();
  queued.docs.forEach((document) => {
    batch.update(document.ref, {
      status: "processing",
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  await batch.commit();
});
