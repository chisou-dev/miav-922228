import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/firebase/requireAdmin";
import {
  CONTACT_COLLECTION,
  isContactStatus,
} from "@/lib/contact/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).status
      : null;

  if (!isContactStatus(status)) {
    return NextResponse.json(
      { error: "status must be unread or read." },
      { status: 400 },
    );
  }

  const ref = getAdminFirestore().collection(CONTACT_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await ref.update({ status });
  return NextResponse.json({ id, status, ok: true });
}
