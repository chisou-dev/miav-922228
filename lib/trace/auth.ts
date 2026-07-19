"use client";

import {
  GoogleAuthProvider,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  signInAnonymously,
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

export function getTraceAuthType(user: User | null): "anonymous" | "google" | null {
  if (!user) return null;
  const providers = user.providerData.map((p) => p.providerId);
  if (providers.includes("google.com")) return "google";
  if (user.isAnonymous) return "anonymous";
  return providers.length ? "google" : "anonymous";
}

export function formatAuthError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code || "")
      : "";

  switch (code) {
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase Console (Anonymous or Google).";
    case "auth/popup-blocked":
      return "The sign-in popup was blocked. Allow popups, or try again (redirect will be used).";
    case "auth/popup-closed-by-user":
      return "The sign-in window was closed before completion.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Authentication → Settings → Authorized domains. Add miav-922228.com and www.miav-922228.com.";
    case "auth/account-exists-with-different-credential":
      return "This Google account is already linked to another sign-in method.";
    case "auth/credential-already-in-use":
      return "This Google account is already used by another Trace session.";
    case "auth/network-request-failed":
      return "Network error during sign-in. Please try again.";
    default: {
      const message =
        error instanceof Error ? error.message : "Sign-in failed.";
      return message;
    }
  }
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  // Identity only — do not add extra scopes.
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export async function signInTraceAnonymous(): Promise<UserCredential> {
  return signInAnonymously(getFirebaseAuth());
}

/**
 * Google Sign-In for Trace ownership only.
 * Tries popup first; falls back to redirect when popups are blocked.
 */
export async function signInTraceGoogle(): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  const provider = googleProvider();

  const tryPopup = async () => {
    if (auth.currentUser?.isAnonymous) {
      try {
        return await linkWithPopup(auth.currentUser, provider);
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code || "")
            : "";
        // Fall through to fresh Google sign-in for common link conflicts.
        if (
          code !== "auth/credential-already-in-use" &&
          code !== "auth/email-already-in-use" &&
          code !== "auth/account-exists-with-different-credential"
        ) {
          throw error;
        }
      }
    }
    return signInWithPopup(auth, provider);
  };

  try {
    return await tryPopup();
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code || "")
        : "";

    if (
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request"
    ) {
      if (auth.currentUser?.isAnonymous) {
        await linkWithRedirect(auth.currentUser, provider);
      } else {
        await signInWithRedirect(auth, provider);
      }
      return null; // page will navigate away
    }

    throw error;
  }
}

/** Complete Google redirect sign-in after returning to the page. */
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
