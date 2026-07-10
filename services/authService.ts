"use client";

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore
} from "firebase/firestore";
import { auth, db, googleProvider } from "@/firebase/client";
import type { Company, UserProfile } from "@/types/company";
import type { Subscription } from "@/types/subscription";

const trialLimits = {
  users: 1,
  products: 500,
  monthlySales: 1000,
  premiumModules: []
};

function assertFirebaseReady() {
  if (!auth || !db) {
    throw new Error("Configure as variáveis NEXT_PUBLIC_FIREBASE_* para usar o Firebase.");
  }
}

function firebaseClients(): { auth: Auth; db: Firestore } {
  assertFirebaseReady();
  return { auth: auth as Auth, db: db as Firestore };
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

  async logout() {
    const clients = firebaseClients();
    await signOut(clients.auth);
  },

  async getProfile(uid: string) {
    const clients = firebaseClients();
    const snapshot = await getDoc(doc(clients.db, "users", uid));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as UserProfile) : null;
  },

  async ensureTenant(user: User) {
    const clients = firebaseClients();
    const userRef = doc(clients.db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) return;

    const companyRef = doc(clients.db, "companies", user.uid);
    const subscriptionRef = doc(clients.db, "subscriptions", user.uid);
    const batch = writeBatch(clients.db);

    const company: Omit<Company, "createdAt" | "updatedAt"> = {
      id: companyRef.id,
      name: user.displayName ? `Empresa de ${user.displayName}` : "Minha empresa",
      ownerId: user.uid,
      currency: "BRL",
      theme: "system",
      lowStockAlertsEnabled: true
    };

    const profile: Omit<UserProfile, "createdAt" | "updatedAt"> = {
      id: user.uid,
      companyId: companyRef.id,
      displayName: user.displayName ?? "Usuário",
      email: user.email ?? "",
      photoURL: user.photoURL ?? undefined,
      role: "owner",
      active: true
    };

    const subscription: Omit<Subscription, "createdAt" | "updatedAt"> = {
      id: subscriptionRef.id,
      companyId: companyRef.id,
      status: "trialing",
      plan: "trial",
      trial: true,
      limits: trialLimits,
      paymentProvider: "manual"
    };

    batch.set(companyRef, {
      ...company,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    batch.set(userRef, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    batch.set(subscriptionRef, {
      ...subscription,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await batch.commit();
  }
};
