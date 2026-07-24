import "server-only";

/**
 * Server Firebase helpers without firebase-admin.
 * (Avoids Vercel/Turbopack ERR_REQUIRE_ESM from jose/jwks-rsa.)
 */
export {
  getAdminUidFromEnv as getAdminUid,
  isAllowedAdminUid,
  isFirebaseAdminEnvConfigured as isFirebaseAdminConfigured,
} from "@/features/firebase/serviceAccount";

export {
  createContactMessage,
  deleteContactMessage,
  listContactMessages,
  updateContactMessageStatus,
} from "@/features/firebase/firestoreRest";
export { verifyFirebaseIdToken } from "@/features/auth/verifyFirebaseIdToken";
