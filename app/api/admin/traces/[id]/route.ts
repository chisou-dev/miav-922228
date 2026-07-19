import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebase/requireAdmin";
import { deleteTraceById } from "@/lib/trace/traceRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Operator-only Trace removal (spam / terms / legal).
 * No edit endpoint exists — the operator never alters Trace content.
 */
export async function DELETE(request: Request, { params }: Props) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  try {
    const deleted = await deleteTraceById(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ id, ok: true, deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete trace.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
