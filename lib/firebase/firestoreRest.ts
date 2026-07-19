import "server-only";

import { getGoogleAccessToken } from "@/lib/firebase/googleAccessToken";
import {
  CONTACT_COLLECTION,
  isContactStatus,
  type ContactMessage,
  type ContactStatus,
} from "@/lib/contact/types";

type FirestoreValue =
  | { stringValue: string }
  | { timestampValue: string }
  | { nullValue: null };

type FirestoreDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

function documentIdFromName(name: string | undefined): string {
  if (!name) return "";
  const parts = name.split("/");
  return parts[parts.length - 1] || "";
}

function readString(
  fields: Record<string, FirestoreValue> | undefined,
  key: string,
): string {
  const value = fields?.[key];
  if (value && "stringValue" in value) return value.stringValue;
  return "";
}

function readTimestamp(
  fields: Record<string, FirestoreValue> | undefined,
  key: string,
  fallback?: string,
): string {
  const value = fields?.[key];
  if (value && "timestampValue" in value) return value.timestampValue;
  return fallback || new Date(0).toISOString();
}

function toContactMessage(doc: FirestoreDocument): ContactMessage {
  const statusRaw = readString(doc.fields, "status");
  return {
    id: documentIdFromName(doc.name),
    name: readString(doc.fields, "name"),
    email: readString(doc.fields, "email"),
    message: readString(doc.fields, "message"),
    status: isContactStatus(statusRaw) ? statusRaw : "unread",
    createdAt: readTimestamp(doc.fields, "createdAt", doc.createTime),
  };
}

async function firestoreFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const { accessToken, projectId } = await getGoogleAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export async function createContactMessage(input: {
  name: string;
  email: string;
  message: string;
}): Promise<{ id: string }> {
  const createdAt = new Date().toISOString();
  const response = await firestoreFetch(`documents/${CONTACT_COLLECTION}`, {
    method: "POST",
    body: JSON.stringify({
      fields: {
        name: { stringValue: input.name },
        email: { stringValue: input.email },
        message: { stringValue: input.message },
        status: { stringValue: "unread" },
        createdAt: { timestampValue: createdAt },
      },
    }),
  });

  const data = (await response.json()) as FirestoreDocument & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to create contact message.");
  }

  return { id: documentIdFromName(data.name) };
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const response = await firestoreFetch("documents:runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: CONTACT_COLLECTION }],
        orderBy: [
          {
            field: { fieldPath: "createdAt" },
            direction: "DESCENDING",
          },
        ],
      },
    }),
  });

  const rows = (await response.json()) as Array<{
    document?: FirestoreDocument;
    error?: { message?: string };
  }>;

  if (!response.ok) {
    const message =
      Array.isArray(rows) && rows[0]?.error?.message
        ? rows[0].error.message
        : "Failed to list contact messages.";
    throw new Error(message);
  }

  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => row.document)
    .filter((doc): doc is FirestoreDocument => Boolean(doc?.name))
    .map(toContactMessage);
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactStatus,
): Promise<boolean> {
  const response = await firestoreFetch(
    `documents/${CONTACT_COLLECTION}/${encodeURIComponent(id)}?updateMask.fieldPaths=status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          status: { stringValue: status },
        },
      }),
    },
  );

  if (response.status === 404) return false;

  const data = (await response.json()) as {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to update contact message.");
  }

  return true;
}

export async function deleteContactMessage(id: string): Promise<boolean> {
  const response = await firestoreFetch(
    `documents/${CONTACT_COLLECTION}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );

  if (response.status === 404) return false;

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(data?.error?.message || "Failed to delete contact message.");
  }

  return true;
}
