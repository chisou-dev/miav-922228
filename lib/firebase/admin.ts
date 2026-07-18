import "server-only";

import { createRequire } from "node:module";
import {
  getAdminUidFromEnv,
  isFirebaseAdminEnvConfigured,
  parseServiceAccountFromEnv,
} from "@/lib/firebase/serviceAccount";

export {
  getAdminUidFromEnv as getAdminUid,
  isFirebaseAdminEnvConfigured as isFirebaseAdminConfigured,
};

// Force Node CJS resolution for firebase-admin (avoids Turbopack ESM jose/jwks-rsa crash).
const require = createRequire(process.cwd() + "/package.json");

type AdminAppModule = {
  getApps: () => unknown[];
  initializeApp: (options: { credential: unknown }) => unknown;
  cert: (serviceAccount: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  }) => unknown;
};

type AdminAuthModule = {
  getAuth: (app?: unknown) => {
    verifyIdToken: (token: string) => Promise<{ uid: string }>;
  };
};

type AdminFirestoreModule = {
  getFirestore: (app?: unknown) => {
    collection: (path: string) => {
      add: (data: Record<string, unknown>) => Promise<{ id: string }>;
      orderBy: (
        field: string,
        direction: "asc" | "desc",
      ) => {
        get: () => Promise<{
          docs: Array<{
            id: string;
            data: () => Record<string, unknown>;
          }>;
        }>;
      };
      doc: (id: string) => {
        get: () => Promise<{ exists: boolean }>;
        update: (data: Record<string, unknown>) => Promise<unknown>;
      };
    };
  };
  FieldValue: {
    serverTimestamp: () => unknown;
  };
};

let app: unknown | null = null;

function loadAdminApp(): AdminAppModule {
  return require("firebase-admin/app") as AdminAppModule;
}

function loadAdminAuth(): AdminAuthModule {
  return require("firebase-admin/auth") as AdminAuthModule;
}

function loadAdminFirestore(): AdminFirestoreModule {
  return require("firebase-admin/firestore") as AdminFirestoreModule;
}

function getAdminApp(): unknown {
  if (app) return app;

  const { getApps, initializeApp, cert } = loadAdminApp();
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

export async function getAdminAuth() {
  return loadAdminAuth().getAuth(getAdminApp());
}

export async function getAdminFirestore() {
  return loadAdminFirestore().getFirestore(getAdminApp());
}

export async function getServerTimestamp() {
  return loadAdminFirestore().FieldValue.serverTimestamp();
}
