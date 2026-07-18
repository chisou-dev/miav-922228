import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(parseServiceAccount());
}

export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    throw new Error("Firebase Admin is not configured.");
  }

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    }),
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

export function getAdminUid(): string | null {
  const uid = process.env.ADMIN_UID?.trim() || process.env.NEXT_PUBLIC_ADMIN_UID?.trim();
  return uid || null;
}
