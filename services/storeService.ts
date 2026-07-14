"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db } from "@/firebase/client";
import { PlatformService } from "@/services/platformService";
import type { Store, StoreInvitation, StoreMember, StoreRole } from "@/types/store";
import type { User } from "firebase/auth";

function assertDb() {
  if (!db) throw new Error("Firebase não configurado.");
  return db;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function memberId(storeId: string, email: string) {
  return `${storeId}_${normalizeEmail(email)}`;
}

function detectDocumentType(document?: string | null) {
  const digits = (document ?? "").replace(/\D/g, "");
  if (digits.length === 11) return "cpf";
  if (digits.length === 14) return "cnpj";
  return null;
}

function storeName(store: Store) {
  return store.name || store.nome || "Loja";
}

async function getStoresByIds(storeIds: string[]) {
  const stores = await Promise.all(storeIds.map((storeId) => StoreService.get(storeId)));
  return stores.filter((store): store is Store => store !== null && store.status === "active");
}

async function ensureOwnerMembership(store: Store, user: User) {
  const firestore = assertDb();
  const email = normalizeEmail(user.email ?? store.ownerEmail);
  const accountId = store.accountId ?? store.companyId;
  await setDoc(doc(firestore, "storeMembers", memberId(store.id, email)), {
    companyId: store.companyId,
    accountId,
    accountStatus: store.accountStatus ?? "active",
    storeId: store.id,
    userId: user.uid,
    email,
    role: "owner",
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export const StoreService = {
  normalizeEmail,
  storeName,

  async get(storeId: string) {
    const firestore = assertDb();
    const snapshot = await getDoc(doc(firestore, "stores", storeId));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Store) : null;
  },

  async findPendingInvitationByEmail(email: string) {
    const firestore = assertDb();
    const normalizedEmail = normalizeEmail(email);
    const invitations = await getDocs(
      query(
        collection(firestore, "invitations"),
        where("email", "==", normalizedEmail),
        where("status", "==", "pending")
      )
    );
    const invitation = invitations.docs.find((item) => Boolean(item.data().companyId));
    if (invitation) return { id: invitation.id, ...invitation.data() } as StoreInvitation;

    const legacyMembers = await getDocs(
      query(
        collection(firestore, "storeMembers"),
        where("email", "==", normalizedEmail),
        where("status", "==", "pending")
      )
    );
    const legacyMember = legacyMembers.docs.find((item) => Boolean(item.data().companyId));
    if (!legacyMember) return null;
    const data = { id: legacyMember.id, ...legacyMember.data() } as StoreMember;
    return {
      id: data.id,
      email: data.email,
      companyId: data.companyId,
      storeId: data.storeId,
      role: data.role === "manager" ? "manager" : "employee",
      status: "pending",
      invitedBy: data.userId ?? "",
      userId: data.userId ?? null,
      createdAt: data.createdAt,
      acceptedAt: null
    } as StoreInvitation;
  },

  async acceptInvitation(invitation: StoreInvitation, user: User) {
    const firestore = assertDb();
    const email = normalizeEmail(user.email ?? invitation.email);
    const invitedStore = invitation.companyId ? null : await this.get(invitation.storeId);
    const companyId = invitation.companyId ?? invitedStore?.companyId;
    if (!companyId) {
      throw new Error("Convite incompleto. Remova e crie o convite novamente.");
    }
    const batch = writeBatch(firestore);
    const store = await this.get(invitation.storeId);
    const accountId = store?.accountId ?? companyId;
    batch.set(doc(firestore, "storeMembers", memberId(invitation.storeId, email)), {
      companyId,
      accountId,
      accountStatus: store?.accountStatus ?? "active",
      storeId: invitation.storeId,
      userId: user.uid,
      email,
      role: invitation.role,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    batch.set(doc(firestore, "invitations", invitation.id), {
      ...invitation,
      email,
      userId: user.uid,
      status: "accepted",
      acceptedAt: serverTimestamp()
    }, { merge: true });
    batch.set(doc(firestore, "users", user.uid), {
      companyId,
      role: invitation.role,
      lastActiveStoreId: invitation.storeId,
      updatedAt: serverTimestamp()
    }, { merge: true });
    await batch.commit();
    await this.updateLastActiveStore(user.uid, invitation.storeId);
    if (!store) throw new Error("Loja do convite não encontrada.");
    return store;
  },

  async findUserStores(user: User) {
    const firestore = assertDb();
    const email = normalizeEmail(user.email ?? "");
    const memberships = await getDocs(
      query(
        collection(firestore, "storeMembers"),
        where("email", "==", email),
        where("status", "==", "active")
      )
    );
    await Promise.all(memberships.docs.map(async (item) => {
      const member = item.data() as StoreMember;
      if (member.userId === user.uid) return;
      try {
        await setDoc(doc(firestore, "storeMembers", item.id), {
          userId: user.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.warn("Não foi possível vincular o usuário ao membro da loja.", error);
      }
    }));
    const memberStores = await getStoresByIds(
      memberships.docs.map((item) => (item.data() as StoreMember).storeId)
    );
    const [ownedById, ownedByEmail] = await Promise.all([
      getDocs(
        query(
          collection(firestore, "stores"),
          where("ownerId", "==", user.uid),
          where("status", "==", "active")
        )
      ).catch((error) => {
        console.warn("Não foi possível listar lojas pelo proprietário.", error);
        return null;
      }),
      email
        ? getDocs(
          query(
            collection(firestore, "stores"),
            where("ownerEmail", "==", email),
            where("status", "==", "active")
          )
        ).catch((error) => {
          console.warn("Não foi possível listar lojas pelo e-mail do proprietário.", error);
          return null;
        })
        : Promise.resolve(null)
    ]);
    const ownedStores = [...(ownedById?.docs ?? []), ...(ownedByEmail?.docs ?? [])]
      .map((item) => ({ id: item.id, ...item.data() }) as Store);
    const allStores = Array.from(
      new Map([...memberStores, ...ownedStores].map((store) => [store.id, store])).values()
    );
    await Promise.all(
      ownedStores.map((store) => ensureOwnerMembership(store, user).catch((error) => {
        console.warn("Não foi possível criar o vínculo de proprietário da loja.", error);
      }))
    );
    await Promise.all(
      allStores.map((store) => PlatformService.ensureAccountForStore({
        accountId: store.accountId ?? store.companyId,
        ownerId: store.ownerId,
        ownerEmail: store.ownerEmail,
        ownerName: user.displayName ?? store.name
      }).catch((error) => {
        console.warn("Não foi possível garantir a conta principal da loja.", error);
      }))
    );
    return allStores;
  },

  async selectLastOrFirstStore(userId: string, stores: Store[]) {
    const firestore = assertDb();
    const snapshot = await getDoc(doc(firestore, "users", userId));
    const lastActiveStoreId = snapshot.exists() ? snapshot.data().lastActiveStoreId as string | undefined : undefined;
    return stores.find((store) => store.id === lastActiveStoreId) ?? stores[0] ?? null;
  },

  async updateLastActiveStore(userId: string, storeId: string) {
    const firestore = assertDb();
    await setDoc(doc(firestore, "users", userId), {
      lastActiveStoreId: storeId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async createStore(input: {
    ownerId: string;
    ownerEmail: string;
    name: string;
    document?: string | null;
    companyId?: string;
  }) {
    const firestore = assertDb();
    const storeRef = doc(collection(firestore, "stores"));
    const ownerEmail = normalizeEmail(input.ownerEmail);
    const companyId = input.companyId ?? input.ownerId;
    const accountId = companyId;
    const documentValue = input.document?.trim() || null;
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, "companies", companyId), {
      name: input.name.trim(),
      ownerId: input.ownerId,
      email: ownerEmail,
      taxId: documentValue,
      currency: "BRL",
      theme: "system",
      lowStockAlertsEnabled: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    batch.set(storeRef, {
      companyId,
      accountId,
      accountStatus: "active",
      name: input.name.trim(),
      nome: input.name.trim(),
      document: documentValue,
      documentType: detectDocumentType(documentValue),
      ownerId: input.ownerId,
      ownerEmail,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    batch.set(doc(firestore, "storeMembers", memberId(storeRef.id, ownerEmail)), {
      companyId,
      accountId,
      accountStatus: "active",
      storeId: storeRef.id,
      userId: input.ownerId,
      email: ownerEmail,
      role: "owner",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    batch.set(doc(firestore, "users", input.ownerId), {
      companyId,
      role: "owner",
      lastActiveStoreId: storeRef.id,
      updatedAt: serverTimestamp()
    }, { merge: true });
    await batch.commit();
    await PlatformService.ensureAccountForStore({
      accountId,
      ownerId: input.ownerId,
      ownerEmail,
      ownerName: input.name.trim()
    }).catch((error) => {
      console.warn("Não foi possível criar a conta auxiliar da plataforma.", error);
    });
    return storeRef.id;
  },

  async createInvitation(input: {
    companyId: string;
    email: string;
    storeId: string;
    role: Exclude<StoreRole, "owner">;
    invitedBy: string;
  }) {
    const firestore = assertDb();
    const invitationRef = doc(collection(firestore, "invitations"));
    await setDoc(invitationRef, {
      email: normalizeEmail(input.email),
      companyId: input.companyId,
      accountId: input.companyId,
      storeId: input.storeId,
      role: input.role,
      status: "pending",
      invitedBy: input.invitedBy,
      userId: null,
      createdAt: serverTimestamp(),
      acceptedAt: null
    });
    return invitationRef.id;
  },

  async listMembers(companyId: string) {
    const firestore = assertDb();
    const snapshot = await getDocs(
      query(collection(firestore, "storeMembers"), where("companyId", "==", companyId), orderBy("email", "asc"))
    );
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as StoreMember);
  },

  async listInvitations(companyId: string) {
    const firestore = assertDb();
    const snapshot = await getDocs(
      query(collection(firestore, "invitations"), where("companyId", "==", companyId), orderBy("email", "asc"))
    );
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as StoreInvitation);
  },

  async listInvitationsByStores(storeIds: string[]) {
    const firestore = assertDb();
    if (storeIds.length === 0) return [];
    const chunks: string[][] = [];
    for (let index = 0; index < storeIds.length; index += 10) {
      chunks.push(storeIds.slice(index, index + 10));
    }
    const snapshots = await Promise.all(chunks.map((ids) =>
      getDocs(query(collection(firestore, "invitations"), where("storeId", "in", ids)))
    ));
    return snapshots.flatMap((snapshot) =>
      snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as StoreInvitation)
    );
  },

  async updateStore(storeId: string, input: Partial<Pick<Store, "name" | "nome" | "status">>) {
    const firestore = assertDb();
    const nextName = input.name ?? input.nome;
    await updateDoc(doc(firestore, "stores", storeId), {
      ...input,
      ...(nextName ? { name: nextName, nome: nextName } : {}),
      updatedAt: serverTimestamp()
    });
  },

  async deleteStore(storeId: string) {
    const firestore = assertDb();
    await updateDoc(doc(firestore, "stores", storeId), {
      status: "archived",
      updatedAt: serverTimestamp()
    });
  },

  async upsertMember(input: {
    companyId?: string;
    storeIds: string[];
    email: string;
    role: StoreRole;
    userId?: string;
    invitedBy?: string;
  }) {
    const firestore = assertDb();
    const email = normalizeEmail(input.email);
    await Promise.all(input.storeIds.map(async (storeId) => {
      const store = await this.get(storeId);
      const companyId = input.companyId ?? store?.companyId;
      const accountId = store?.accountId ?? companyId;
      if (!companyId) throw new Error("Empresa da loja não encontrada.");
      await setDoc(doc(firestore, "storeMembers", memberId(storeId, email)), {
        companyId,
        accountId,
        accountStatus: store?.accountStatus ?? "active",
        storeId,
        ...(input.userId ? { userId: input.userId } : {}),
        email,
        role: input.role === "manager" ? "manager" : "employee",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }));
  },

  async updateMember(member: StoreMember, input: Partial<Pick<StoreMember, "role" | "status">>) {
    const firestore = assertDb();
    await updateDoc(doc(firestore, "storeMembers", member.id), {
      ...input,
      updatedAt: serverTimestamp()
    });
  },

  async removeMember(memberIdToRemove: string) {
    const firestore = assertDb();
    await deleteDoc(doc(firestore, "storeMembers", memberIdToRemove));
  },

  async removeInvitation(invitationId: string) {
    const firestore = assertDb();
    await deleteDoc(doc(firestore, "invitations", invitationId));
  }
};
