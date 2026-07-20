import { NextResponse } from "next/server";
import { requireTraceUser } from "@/lib/trace/requireTraceUser";
import {
  TRACE_PAGE_SIZE,
} from "@/lib/trace/types";
import {
  createTrace,
  getTraceByUid,
  getTraceStats,
  listCitiesForRegion,
  listLocationCountsForCountry,
  listRegionsForCountry,
  listTracesAtCity,
  listTracesByLocationId,
  pinFromRecord,
  updateTraceLocationMessage,
  upgradeTraceToPermanent,
} from "@/lib/trace/traceRest";
import {
  findCountry,
  findRegion,
  findCity,
  getLocationById,
} from "@/lib/locations";
import { bodyContainsForbiddenPii } from "@/lib/trace/privacy";
import { normalizeTraceMessage } from "@/lib/trace/messagePolicy";
import {
  getSiteControl,
} from "@/lib/site-control/siteControlRest";
import { TRACE_DISABLED_MESSAGE } from "@/lib/site-control/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validateLocation(body: {
  country?: unknown;
  region?: unknown;
  city?: unknown;
  locationId?: unknown;
  message?: unknown;
  lat?: unknown;
  lng?: unknown;
}) {
  // Reject client-supplied coordinates — only Catalog places are accepted.
  if (body.lat != null || body.lng != null) {
    return { error: "Coordinates are not accepted; choose a catalog location." };
  }
  const locationId =
    typeof body.locationId === "string" ? body.locationId.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";
  const region = typeof body.region === "string" ? body.region.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const messageResult = normalizeTraceMessage(body.message);
  if (!messageResult.ok) return { error: messageResult.error };
  const message = messageResult.message;

  if (locationId) {
    const loc = getLocationById(locationId);
    if (!loc) return { error: "Unknown location." };
    return {
      locationId: loc.locationId,
      country: loc.country,
      region: loc.region,
      city: loc.city,
      message,
    };
  }

  if (!country || !region || !city) {
    return { error: "Country, region, and city are required." };
  }

  const countryNode = findCountry(country);
  if (!countryNode) return { error: "Unknown country." };
  const regionNode = findRegion(countryNode, region);
  if (!regionNode) return { error: "Unknown region." };
  const cityNode = findCity(regionNode, city);
  if (!cityNode) return { error: "Unknown city." };

  return {
    locationId: cityNode.locationId,
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
  return record ? pinFromRecord(record) : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view")?.trim() || "overview";
    const country = searchParams.get("country")?.trim() || "";
    const region = searchParams.get("region")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const locationId = searchParams.get("locationId")?.trim() || "";
    const cursor = searchParams.get("cursor")?.trim() || null;
    const limitRaw = Number(searchParams.get("limit") || TRACE_PAGE_SIZE);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(1, limitRaw), 100)
      : TRACE_PAGE_SIZE;

    const mine = view === "overview" ? await resolveMine(request) : null;

    if (view === "counts") {
      if (!country) {
        return NextResponse.json(
          { error: "country is required for counts." },
          { status: 400 },
        );
      }
      const counts = await listLocationCountsForCountry(country);
      return NextResponse.json({ counts });
    }

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
      if (locationId) {
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
      if (!country || !region || !city) {
        return NextResponse.json(
          {
            error:
              "locationId or country, region, and city are required for traces.",
          },
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
      return NextResponse.json({
        trace: pinFromRecord(upgraded),
        ok: true,
      });
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
      locationId: string;
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
        trace: pinFromRecord(updated),
        ok: true,
        mode: "update",
      });
    }

    const siteControl = await getSiteControl();
    if (!siteControl.traceEnabled) {
      return NextResponse.json(
        {
          error: TRACE_DISABLED_MESSAGE,
          code: "TRACE_DISABLED",
        },
        { status: 503 },
      );
    }

    const created = await createTrace({
      uid: auth.uid,
      authType: auth.authType,
      ...location,
    });

    return NextResponse.json({
      trace: pinFromRecord(created),
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
