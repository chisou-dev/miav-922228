import { NextResponse } from "next/server";
import {
  deleteContactMessage,
  updateContactMessageStatus,
} from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/firebase/requireAdmin";
import { isContactStatus } from "@/lib/contact/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: Props) {
  const auth = await requireAdmin(_request);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  try {
    const deleted = await deleteContactMessage(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ id, ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

  try {
    const updated = await updateContactMessageStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ id, status, ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
