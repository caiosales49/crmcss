"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore
} from "firebase/firestore";
import { auth, db, googleProvider } from "@/firebase/client";
import type { UserProfile } from "@/types/company";

function assertFirebaseReady() {
  if (!auth || !db) {
    throw new Error("Configure as variáveis NEXT_PUBLIC_FIREBASE_* para usar o Firebase.");
  }
}

function firebaseClients(): { auth: Auth; db: Firestore } {
  assertFirebaseReady();
  return { auth: auth as Auth, db: db as Firestore };
}

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

async function findActiveMemberByEmail(clients: { db: Firestore }, email: string) {
  const snapshot = await getDocs(
    query(
      collection(clients.db, "storeMembers"),
      where("email", "==", email),
      where("status", "==", "active")
    )
  );
  return snapshot.docs[0]?.data() ?? null;
}

async function findPendingInvitationByEmail(clients: { db: Firestore }, email: string) {
  const invitationSnapshot = await getDocs(
    query(
      collection(clients.db, "invitations"),
      where("email", "==", email),
      where("status", "==", "pending")
    )
  );
  const invitation = invitationSnapshot.docs.find((item) => Boolean(item.data().companyId))?.data();
  if (invitation) return invitation;

  const memberSnapshot = await getDocs(
    query(
      collection(clients.db, "storeMembers"),
      where("email", "==", email),
      where("status", "==", "pending")
    )
  );
  return memberSnapshot.docs.find((item) => Boolean(item.data().companyId))?.data() ?? null;
}

export const AuthService = {
  onAuthStateChanged(callback: (user: User | null) => void) {
    const clients = firebaseClients();
    return onAuthStateChanged(clients.auth, callback);
  },

  async signInWithGoogle() {
    const clients = firebaseClients();
    const credential = await signInWithPopup(clients.auth, googleProvider);
    return credential.user;
  },

  async signInWithEmail(email: string, password: string) {
    const clients = firebaseClients();
    const credential = await signInWithEmailAndPassword(clients.auth, normalizeEmail(email), password);
    return credential.user;
  },

  async createAccountWithEmail(input: { name: string; email: string; password: string }) {
    const clients = firebaseClients();
    const credential = await createUserWithEmailAndPassword(
      clients.auth,
      normalizeEmail(input.email),
      input.password
    );
    await updateProfile(credential.user, { displayName: input.name.trim() });
    return credential.user;
  },

  async logout() {
    const clients = firebaseClients();
    await signOut(clients.auth);
  },

  async getProfile(uid: string) {
    const clients = firebaseClients();
    const snapshot = await getDoc(doc(clients.db, "users", uid));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as UserProfile) : null;
  },

  async upsertGoogleProfile(user: User) {
    const clients = firebaseClients();
    const userRef = doc(clients.db, "users", user.uid);
    const existing = await getDoc(userRef);
    const current = existing.exists() ? existing.data() : {};
    const email = normalizeEmail(user.email);
    const activeMember = await findActiveMemberByEmail(clients, email);
    const pendingInvitation = activeMember ? null : await findPendingInvitationByEmail(clients, email);
    const shouldUseMemberProfile = Boolean(activeMember)
      && (!existing.exists() || current.companyId === user.uid || current.role !== "owner");
    const shouldUsePendingProfile = Boolean(pendingInvitation)
      && (!existing.exists() || current.companyId === user.uid || current.role !== "owner");

    await setDoc(userRef, {
      id: user.uid,
      email,
      name: user.displayName ?? current.name ?? "Usuário",
      displayName: user.displayName ?? current.displayName ?? "Usuário",
      photoURL: user.photoURL ?? current.photoURL ?? null,
      companyId: shouldUseMemberProfile
        ? activeMember?.companyId
        : shouldUsePendingProfile
          ? pendingInvitation?.companyId
          : current.companyId ?? user.uid,
      role: shouldUseMemberProfile
        ? activeMember?.role
        : shouldUsePendingProfile
          ? pendingInvitation?.role
          : current.role ?? "owner",
      active: current.active ?? true,
      lastActiveStoreId: shouldUseMemberProfile
        ? activeMember?.storeId
        : shouldUsePendingProfile
          ? pendingInvitation?.storeId
          : current.lastActiveStoreId ?? null,
      createdAt: current.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    const snapshot = await getDoc(userRef);
    return { id: snapshot.id, ...snapshot.data() } as UserProfile;
  }
};
