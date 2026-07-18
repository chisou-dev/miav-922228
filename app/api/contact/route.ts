import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminFirestore,
  isFirebaseAdminConfigured,
} from "@/lib/firebase/admin";
import { CONTACT_COLLECTION } from "@/lib/contact/types";
import {
  consumeContactRateLimit,
  getRequestIp,
} from "@/lib/contact/rateLimit";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function silentOk() {
  // Look like success so bots do not retry aggressively.
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Contact storage is not configured." },
      { status: 503 },
    );
  }

  const ip = getRequestIp(request);
  const rate = consumeContactRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSec),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;

  // Honeypot: real users leave this empty. Bots that fill it are rejected quietly.
  const honeypot =
    typeof record.website === "string" ? record.website.trim() : "";
  if (honeypot) {
    return silentOk();
  }

  const name = typeof record.name === "string" ? record.name.trim() : "";
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const message = typeof record.message === "string" ? record.message.trim() : "";

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email || !isValidEmail(email) || email.length > 200) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!message || message.length > 5000) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const doc = await getAdminFirestore().collection(CONTACT_COLLECTION).add({
    name,
    email,
    message,
    status: "unread",
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: doc.id, ok: true });
}
