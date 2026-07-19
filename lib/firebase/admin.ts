import "server-only";

/**
 * Server Firebase helpers without firebase-admin.
 * (Avoids Vercel/Turbopack ERR_REQUIRE_ESM from jose/jwks-rsa.)
 */
export {
  getAdminUidFromEnv as getAdminUid,
  isAllowedAdminUid,
  isFirebaseAdminEnvConfigured as isFirebaseAdminConfigured,
} from "@/lib/firebase/serviceAccount";

export { createContactMessage, listContactMessages, updateContactMessageStatus } from "@/lib/firebase/firestoreRest";
export { verifyFirebaseIdToken } from "@/lib/firebase/verifyFirebaseIdToken";
