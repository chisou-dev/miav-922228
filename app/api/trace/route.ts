import { NextResponse } from "next/server";
import { requireTraceUser } from "@/lib/trace/requireTraceUser";
import {
  MAX_TRACE_MESSAGE_LENGTH,
  TRACE_PAGE_SIZE,
  toTracePin,
} from "@/lib/trace/types";
import {
  createTrace,
  getTraceByUid,
  getTraceStats,
  listCitiesForRegion,
  listRegionsForCountry,
  listTracesAtCity,
  updateTraceLocationMessage,
  upgradeTraceToPermanent,
} from "@/lib/trace/traceRest";
import { findCountry, findRegion, findCity } from "@/lib/locations";
import { bodyContainsForbiddenPii } from "@/lib/trace/privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validateLocation(body: {
  country?: unknown;
  region?: unknown;
  city?: unknown;
  message?: unknown;
}) {
  const country = typeof body.country === "string" ? body.country.trim() : "";
  const region = typeof body.region === "string" ? body.region.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!country || !region || !city) {
    return { error: "Country, region, and city are required." };
  }

  const countryNode = findCountry(country);
  if (!countryNode) return { error: "Unknown country." };
  const regionNode = findRegion(countryNode, region);
  if (!regionNode) return { error: "Unknown region." };
  const cityNode = findCity(regionNode, city);
  if (!cityNode) return { error: "Unknown city." };

  if (!message) return { error: "Message is required." };
  if (message.length > MAX_TRACE_MESSAGE_LENGTH) {
    return {
      error: `Message must be ${MAX_TRACE_MESSAGE_LENGTH} characters or fewer.`,
    };
  }

  return {
    country: countryNode.name,
    region: regionNode.name,
    city: cityNode.name,
    message,
  };
}

async function resolveMine(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!/^Bearer\s+/i.test(header)) return null;
  const auth = await requireTraceUser(request);
  if (auth.error) return null;
  const record = await getTraceByUid(auth.uid);
  return record ? toTracePin(record) : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view")?.trim() || "overview";
    const country = searchParams.get("country")?.trim() || "";
    const region = searchParams.get("region")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const cursor = searchParams.get("cursor")?.trim() || null;
    const limitRaw = Number(searchParams.get("limit") || TRACE_PAGE_SIZE);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(1, limitRaw), 100)
      : TRACE_PAGE_SIZE;

    const mine = view === "overview" ? await resolveMine(request) : null;

    if (view === "regions") {
      if (!country) {
        return NextResponse.json(
          { error: "country is required for regions." },
          { status: 400 },
        );
      }
      const regions = await listRegionsForCountry(country);
      return NextResponse.json({ regions });
    }

    if (view === "cities") {
      if (!country || !region) {
        return NextResponse.json(
          { error: "country and region are required for cities." },
          { status: 400 },
        );
      }
      const cities = await listCitiesForRegion(country, region);
      return NextResponse.json({ cities });
    }

    if (view === "traces") {
      if (!country || !region || !city) {
        return NextResponse.json(
          { error: "country, region, and city are required for traces." },
          { status: 400 },
        );
      }
      const page = await listTracesAtCity({
        country,
        region,
        city,
        limit,
        cursor,
      });
      return NextResponse.json({
        traces: page.traces,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        scope: { country, region, city },
      });
    }

    // overview — stats only; never load all traces or all locations.
    const stats = await getTraceStats();
    return NextResponse.json({ stats, mine });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load traces.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireTraceUser(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body && typeof body === "object") {
    const forbidden = bodyContainsForbiddenPii(body as Record<string, unknown>);
    if (forbidden) {
      return NextResponse.json(
        {
          error:
            "Personal profile fields are not accepted. Only location and message may be saved.",
          field: forbidden,
        },
        { status: 400 },
      );
    }
  }

  const action =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).action
      : null;

  try {
    if (action === "upgrade") {
      if (auth.authType !== "google") {
        return NextResponse.json(
          { error: "Google sign-in required to make a Permanent Trace." },
          { status: 400 },
        );
      }
      const upgraded = await upgradeTraceToPermanent(auth.uid);
      return NextResponse.json({ trace: toTracePin(upgraded), ok: true });
    }

    const parsed = validateLocation(
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : {},
    );
    if ("error" in parsed && parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const location = parsed as {
      country: string;
      region: string;
      city: string;
      message: string;
    };

    const existing = await getTraceByUid(auth.uid);
    if (existing) {
      const updated = await updateTraceLocationMessage({
        uid: auth.uid,
        ...location,
      });
      return NextResponse.json({
        trace: toTracePin(updated),
        ok: true,
        mode: "update",
      });
    }

    const created = await createTrace({
      uid: auth.uid,
      authType: auth.authType,
      ...location,
    });

    return NextResponse.json({
      trace: toTracePin(created),
      ok: true,
      mode: "create",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save trace.";
    if (message === "TRACE_EXISTS") {
      return NextResponse.json(
        {
          error:
            "You already have a Trace. You may only edit location and message.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
