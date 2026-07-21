import { NextResponse } from "next/server";
import { requireTraceUser } from "@/lib/trace/requireTraceUser";
import { getPlaceById } from "@/lib/places";
import { TRACE_PAGE_SIZE } from "@/lib/trace/types";
import {
  createTrace,
  getTraceByUid,
  getTraceStats,
  listMemoryStars,
  listTracesByLocationId,
  pinFromRecord,
} from "@/lib/trace/traceRest";
import { bodyContainsForbiddenPii } from "@/lib/trace/privacy";
import {
  MAX_GUEST_MESSAGE_LENGTH,
  MAX_GOOGLE_MESSAGE_LENGTH,
} from "@/lib/trace/messagePolicy";
import { normalizeTraceMessage } from "@/lib/trace/messagePolicy";
import { getSiteControl } from "@/lib/site-control/siteControlRest";
import { TRACE_DISABLED_MESSAGE } from "@/lib/site-control/types";
import { isValidVisitorId } from "@/lib/trace/visitorId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validatePostBody(body: Record<string, unknown>) {
  if (body.lat != null || body.lng != null) {
    return { error: "Coordinates are not accepted; choose a catalog place." };
  }

  const locationId =
    typeof body.locationId === "string" ? body.locationId.trim() : "";
  if (!locationId) {
    return { error: "locationId is required." };
  }

  const place = getPlaceById(locationId);
  if (!place) {
    return { error: "Unknown place." };
  }

  return { locationId: place.locationId, place };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view")?.trim() || "map";
    const locationId = searchParams.get("locationId")?.trim() || "";
    const visitorId = searchParams.get("visitorId")?.trim() || "";
    const cursor = searchParams.get("cursor")?.trim() || null;
    const limitRaw = Number(searchParams.get("limit") || TRACE_PAGE_SIZE);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(1, limitRaw), 100)
      : TRACE_PAGE_SIZE;

    if (view === "map") {
      const [stars, stats] = await Promise.all([
        listMemoryStars(),
        getTraceStats(),
      ]);
      return NextResponse.json({ stars, stats });
    }

    if (view === "memories") {
      if (!locationId) {
        return NextResponse.json(
          { error: "locationId is required." },
          { status: 400 },
        );
      }
      const page = await listTracesByLocationId({
        locationId,
        limit,
        cursor,
      });
      return NextResponse.json({
        traces: page.traces,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        scope: { locationId },
      });
    }

    if (view === "status") {
      const header = request.headers.get("authorization") || "";
      let mine = null;
      if (/^Bearer\s+/i.test(header)) {
        const auth = await requireTraceUser(request);
        if (!auth.error) {
          const record = await getTraceByUid(auth.uid);
          mine = record ? pinFromRecord(record) : null;
        }
      }

      let guestPosted = false;
      if (visitorId && isValidVisitorId(visitorId)) {
        const guest = await getTraceByUid(visitorId);
        guestPosted = Boolean(guest);
      }

      return NextResponse.json({
        posted: Boolean(mine) || guestPosted,
        mine,
        guestPosted,
      });
    }

    return NextResponse.json({ error: "Unknown view." }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load memories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const forbidden = bodyContainsForbiddenPii(payload);
  if (forbidden) {
    return NextResponse.json(
      {
        error:
          "Personal profile fields are not accepted. Only place and message may be saved.",
        field: forbidden,
      },
      { status: 400 },
    );
  }

  const header = request.headers.get("authorization") || "";
  const hasBearer = /^Bearer\s+/i.test(header);
  const visitorId =
    typeof payload.visitorId === "string" ? payload.visitorId.trim() : "";

  try {
    const locationResult = validatePostBody(payload);
    if ("error" in locationResult) {
      return NextResponse.json({ error: locationResult.error }, { status: 400 });
    }

    const { place, locationId } = locationResult;

    if (hasBearer) {
      const auth = await requireTraceUser(request);
      if (auth.error) return auth.error;
      if (auth.authType !== "google") {
        return NextResponse.json(
          { error: "Google sign-in is required for a long Memory." },
          { status: 400 },
        );
      }

      const messageResult = normalizeTraceMessage(
        payload.message,
        MAX_GOOGLE_MESSAGE_LENGTH,
      );
      if (!messageResult.ok) {
        return NextResponse.json({ error: messageResult.error }, { status: 400 });
      }

      const existing = await getTraceByUid(auth.uid);
      if (existing) {
        return NextResponse.json(
          { error: "You already left a Memory with this Google account." },
          { status: 409 },
        );
      }

      const siteControl = await getSiteControl();
      if (!siteControl.traceEnabled) {
        return NextResponse.json(
          { error: TRACE_DISABLED_MESSAGE, code: "TRACE_DISABLED" },
          { status: 503 },
        );
      }

      const created = await createTrace({
        uid: auth.uid,
        authType: "google",
        locationId,
        country: place.country,
        region: "",
        city: place.name,
        message: messageResult.message,
      });

      return NextResponse.json({
        trace: pinFromRecord(created),
        ok: true,
      });
    }

    if (!visitorId || !isValidVisitorId(visitorId)) {
      return NextResponse.json(
        { error: "A valid visitorId is required." },
        { status: 400 },
      );
    }

    const messageResult = normalizeTraceMessage(
      payload.message,
      MAX_GUEST_MESSAGE_LENGTH,
    );
    if (!messageResult.ok) {
      return NextResponse.json({ error: messageResult.error }, { status: 400 });
    }

    const existing = await getTraceByUid(visitorId);
    if (existing) {
      return NextResponse.json(
        { error: "You already left a Memory from this browser." },
        { status: 409 },
      );
    }

    const siteControl = await getSiteControl();
    if (!siteControl.traceEnabled) {
      return NextResponse.json(
        { error: TRACE_DISABLED_MESSAGE, code: "TRACE_DISABLED" },
        { status: 503 },
      );
    }

    const created = await createTrace({
      uid: visitorId,
      authType: "guest",
      locationId,
      country: place.country,
      region: "",
      city: place.name,
      message: messageResult.message,
    });

    return NextResponse.json({
      trace: pinFromRecord(created),
      ok: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save memory.";
    if (message === "TRACE_EXISTS") {
      return NextResponse.json(
        { error: "You already left a Memory." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
