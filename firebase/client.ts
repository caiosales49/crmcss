"use client";

import { getAnalytics, isSupported } from "firebase/analytics";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported as isMessagingSupported } from "firebase/messaging";
import { getRemoteConfig } from "firebase/remote-config";
import { getStorage } from "firebase/storage";
import { firebaseEnv, hasFirebaseConfig } from "@/lib/env";

const app = hasFirebaseConfig()
  ? getApps()[0] ?? initializeApp(firebaseEnv)
  : undefined;

export const firebaseApp = app;
export const auth = app ? getAuth(app) : undefined;
export const db = app ? getFirestore(app) : undefined;
export const storage = app ? getStorage(app) : undefined;
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

export async function analytics() {
  if (!app || !(await isSupported())) return undefined;
  return getAnalytics(app);
}

export async function messaging() {
  if (!app || !(await isMessagingSupported())) return undefined;
  return getMessaging(app);
}

export function remoteConfig() {
  if (!app) return undefined;
  const config = getRemoteConfig(app);
  config.settings.minimumFetchIntervalMillis = 60 * 60 * 1000;
  config.defaultConfig = {
    premiumModulesEnabled: false
  };
  return config;
}
