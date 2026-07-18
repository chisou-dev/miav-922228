/**
 * Public Firebase client env names required in the browser / Vercel Production.
 * Values must never be committed; set them in Vercel Environment Variables.
 */
export const FIREBASE_CLIENT_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export const FIREBASE_ADMIN_ENV_KEYS = [
  "ADMIN_UID",
  "NEXT_PUBLIC_ADMIN_UID",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
] as const;

export function getFirebaseClientEnv() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || "",
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || "",
  };
}

export function getMissingFirebaseClientEnvKeys(): string[] {
  const env = getFirebaseClientEnv();
  const required: Array<[string, string]> = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", env.apiKey],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", env.authDomain],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", env.projectId],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", env.appId],
  ];

  return required.filter(([, value]) => !value).map(([key]) => key);
}

export function isFirebaseClientEnvReady(): boolean {
  return getMissingFirebaseClientEnvKeys().length === 0;
}

export function isAdminUidConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_UID?.trim() || process.env.NEXT_PUBLIC_ADMIN_UID?.trim(),
  );
}
