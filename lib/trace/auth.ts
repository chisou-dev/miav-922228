"use client";

import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";

export function watchAuth(callback: (user: User | null) => void) {
  if (!isFirebaseClientConfigured()) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function getTraceAuthType(user: User | null): "google" | null {
  if (!user) return null;
  const providers = user.providerData.map((p) => p.providerId);
  if (providers.includes("google.com")) return "google";
  return null;
}

export function formatAuthError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code || "")
      : "";

  switch (code) {
    case "auth/popup-blocked":
      return "The sign-in popup was blocked. Allow popups, or try again.";
    case "auth/popup-closed-by-user":
      return "The sign-in window was closed before completion.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Authentication.";
    case "auth/network-request-failed":
      return "Network error during sign-in. Please try again.";
    default:
      return error instanceof Error ? error.message : "Sign-in failed.";
  }
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export async function signInTraceGoogle(): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  const provider = googleProvider();

  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code || "")
        : "";
    if (
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request"
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function completeTraceRedirectSignIn(): Promise<UserCredential | null> {
  if (!isFirebaseClientConfigured()) return null;
  try {
    return await getRedirectResult(getFirebaseAuth());
  } catch {
    return null;
  }
}

export async function signOutTrace() {
  await signOut(getFirebaseAuth());
}

export async function getIdTokenOrNull(user: User | null) {
  if (!user) return null;
  return user.getIdToken();
}
