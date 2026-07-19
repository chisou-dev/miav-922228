import { NextResponse } from "next/server";
import {
  createContactMessage,
  isFirebaseAdminConfigured,
} from "@/lib/firebase/admin";
import {
  consumeContactRateLimit,
  getRequestIp,
} from "@/lib/contact/rateLimit";
import { getSiteControl } from "@/lib/site-control/siteControlRest";
import { CONTACT_DISABLED_MESSAGE } from "@/lib/site-control/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function silentOk() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Contact storage is not configured." },
      { status: 503 },
    );
  }

  const siteControl = await getSiteControl();
  if (!siteControl.contactEnabled) {
    return NextResponse.json(
      {
        error: CONTACT_DISABLED_MESSAGE,
        code: "CONTACT_DISABLED",
      },
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
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }
  if (!message || message.length > 5000) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  try {
    const doc = await createContactMessage({ name, email, message });
    return NextResponse.json({ id: doc.id, ok: true });
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Unable to save message.";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
