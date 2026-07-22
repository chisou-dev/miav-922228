import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebase/requireAdmin";
import { seedStoryMemories } from "@/lib/trace/traceRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Temporary one-shot key for literary seed — remove after use. */
const ONE_SHOT_SEED_KEY = "miav-story-seed-20260722-nY7kQp";

function authorizeSeed(request: Request): boolean {
  const headerKey = request.headers.get("x-seed-key")?.trim();
  if (headerKey && headerKey === ONE_SHOT_SEED_KEY) return true;

  const seedKey = process.env.SEED_STORY_KEY?.trim();
  if (seedKey && headerKey && seedKey === headerKey) return true;

  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (cronSecret && bearer === cronSecret) return true;

  return false;
}

/**
 * Operator seed for literary story Memories.
 * Auth: admin Bearer, x-seed-key, or CRON_SECRET Bearer.
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
