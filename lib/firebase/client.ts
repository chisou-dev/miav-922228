import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirebaseClientEnv,
  isFirebaseClientEnvReady,
} from "@/lib/firebase/env";

export function isFirebaseClientConfigured(): boolean {
  return isFirebaseClientEnvReady();
}

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseClientConfigured()) {
    throw new Error("Firebase client environment variables are not configured.");
  }

  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const config = getFirebaseClientEnv();
  return initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket || undefined,
    messagingSenderId: config.messagingSenderId || undefined,
    appId: config.appId,
  });
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getPublicAdminUid(): string | null {
  const uid = process.env.NEXT_PUBLIC_ADMIN_UID?.trim();
  return uid || null;
}
