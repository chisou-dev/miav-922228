import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebase/requireAdmin";
import { seedStoryMemories } from "@/lib/trace/traceRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeSeed(request: Request): boolean {
  const seedKey = process.env.SEED_STORY_KEY?.trim();
  const headerKey = request.headers.get("x-seed-key")?.trim();
  if (seedKey && headerKey && seedKey === headerKey) return true;

  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (cronSecret && bearer === cronSecret) return true;

  return false;
}

/**
 * Operator seed for literary story Memories (idempotent).
 * Auth: admin Bearer, SEED_STORY_KEY, or CRON_SECRET Bearer.
 */
export async function POST(request: Request) {
  if (!authorizeSeed(request)) {
    const admin = await requireAdmin(request);
    if (admin.error) return admin.error;
  }

  try {
    const result = await seedStoryMemories();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to seed story memories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
