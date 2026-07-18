import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  getAdminUidFromEnv,
  isFirebaseAdminEnvConfigured,
  parseServiceAccountFromEnv,
} from "@/lib/firebase/serviceAccount";

export {
  getAdminUidFromEnv as getAdminUid,
  isFirebaseAdminEnvConfigured as isFirebaseAdminConfigured,
};

let app: App | null = null;

function getAdminApp(): App {
  if (app) return app;

  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return existing;
  }

  const serviceAccount = parseServiceAccountFromEnv();
  if (!serviceAccount) {
    throw new Error("Firebase Admin is not configured.");
  }

  app = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    }),
  });

  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

export { FieldValue };
