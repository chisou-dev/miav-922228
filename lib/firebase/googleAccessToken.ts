import "server-only";

import crypto from "node:crypto";
import {
  parseServiceAccountFromEnv,
  type ServiceAccountJson,
} from "@/lib/firebase/serviceAccount";

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let cachedToken: TokenCache | null = null;

function toBase64Url(input: Buffer | string): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createServiceAccountJwt(serviceAccount: ServiceAccountJson): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  );
  const payload = toBase64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/datastore",
    }),
  );

  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = toBase64Url(
    signer.sign(serviceAccount.private_key.replace(/\\n/g, "\n")),
  );
  return `${unsigned}.${signature}`;
}

export async function getGoogleAccessToken(): Promise<{
  accessToken: string;
  projectId: string;
}> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now() + 60_000) {
    const serviceAccount = parseServiceAccountFromEnv();
    if (!serviceAccount) {
      throw new Error("Firebase Admin is not configured.");
    }
    return {
      accessToken: cachedToken.accessToken,
      projectId: serviceAccount.project_id,
    };
  }

  const serviceAccount = parseServiceAccountFromEnv();
  if (!serviceAccount) {
    throw new Error("Firebase Admin is not configured.");
  }

  const assertion = createServiceAccountJwt(serviceAccount);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Failed to obtain Google access token.",
    );
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAtMs: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  return {
    accessToken: data.access_token,
    projectId: serviceAccount.project_id,
  };
}
