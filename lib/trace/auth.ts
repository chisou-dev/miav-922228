"use client";

import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";

export function watchAuth(callback: (user: User | null) => void) {
  if (!isFirebaseClientConfigured()) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function getTraceAuthType(user: User | null): "anonymous" | "google" | null {
  if (!user) return null;
  const providers = user.providerData.map((p) => p.providerId);
  if (providers.includes("google.com")) return "google";
  if (user.isAnonymous) return "anonymous";
  return providers.length ? "google" : "anonymous";
}

export async function signInTraceAnonymous() {
  return signInAnonymously(getFirebaseAuth());
}

/**
 * Google Sign-In for Trace ownership only.
 * - No extra OAuth scopes (no Contacts, Drive, etc.)
 * - Email / displayName / photoURL may exist on the in-memory User object
 *   for Firebase Auth, but are NEVER written to Firestore.
 */
export async function signInTraceGoogle() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  // Minimal identity prompt — do not addScope() for profile extras.
  provider.setCustomParameters({
    prompt: "select_account",
  });

  if (auth.currentUser?.isAnonymous) {
    try {
      return await linkWithPopup(auth.currentUser, provider);
    } catch {
      // If credential already linked elsewhere, fall through to fresh Google sign-in.
    }
  }

  return signInWithPopup(auth, provider);
}

export async function signOutTrace() {
  await signOut(getFirebaseAuth());
}

export async function getIdTokenOrNull(user: User | null) {
  if (!user) return null;
  return user.getIdToken();
}
