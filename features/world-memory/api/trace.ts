import { NextResponse } from "next/server";
import { requireTraceUser } from "@/features/world-memory/trace/requireTraceUser";
import { getPlaceById } from "@/features/world-memory/location/places";
import { TRACE_PAGE_SIZE } from "@/features/world-memory/trace/types";
import {
  getTraceStats,
  listMemoryStars,
  listTracePins,
  listTracesByLocationId,
} from "@/features/world-memory/trace/traceRest";
import {
  createActivity,
  getLatestPublicMemoryForUid,
  listPostedWorkIds,
} from "@/features/world-memory/trace/activityRest";
import { ensureMiavIdentity } from "@/features/world-memory/trace/identityRest";
import { bodyContainsForbiddenPii } from "@/features/world-memory/trace/privacy";
import { MAX_GOOGLE_MESSAGE_LENGTH } from "@/features/world-memory/trace/messagePolicy";
import { normalizeTraceMessage } from "@/features/world-memory/trace/messagePolicy";
import { getSiteControl } from "@/features/dashboard/site-control/siteControlRest";
import { TRACE_DISABLED_MESSAGE } from "@/features/dashboard/site-control/types";
import { validateCategoryWork } from "@/features/world-memory/trace/works";
import { parseCategoriesParam } from "@/features/world-memory/trace/aggregate";
import { findCountry } from "@/features/world-memory/location/locations";

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
    const cursor = searchParams.get("cursor")?.trim() || null;
    const limitRaw = Number(searchParams.get("limit") || TRACE_PAGE_SIZE);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(1, limitRaw), 100)
      : TRACE_PAGE_SIZE;

    if (view === "map") {
      // Legacy Traces + Activities (merged in listTracePins).
      const [stars, stats, recent] = await Promise.all([
        listMemoryStars(),
        getTraceStats(),
        listTracePins({ limit: 20 }),
      ]);
      return NextResponse.json({ stars, stats, recent });
    }

    if (view === "geo") {
      const categoriesResult = parseCategoriesParam(
        searchParams.get("categories"),
      );
      if ("error" in categoriesResult) {
        return NextResponse.json(
          { error: categoriesResult.error },
          { status: 400 },
        );
      }

      const scopeRaw = (searchParams.get("scope") || "world").trim().toLowerCase();
      if (scopeRaw !== "world" && scopeRaw !== "country") {
        return NextResponse.json(
          { error: "scope must be world or country." },
          { status: 400 },
        );
      }

      if (scopeRaw === "world") {
        const { getGeographyAggregates } = await import(
          "@/features/world-memory/trace/aggregateRest"
        );
        const result = await getGeographyAggregates({
          scope: { level: "world" },
          categories: categoriesResult,
        });
        return NextResponse.json(result);
      }

      const countryRaw =
        searchParams.get("country")?.trim() ||
        searchParams.get("countryCode")?.trim() ||
        "";
      if (!countryRaw) {
        return NextResponse.json(
          { error: "country is required for scope=country." },
          { status: 400 },
        );
      }
      const country = findCountry(countryRaw);
      if (!country) {
        return NextResponse.json(
          { error: "Unknown country." },
          { status: 400 },
        );
      }

      const { getGeographyAggregates } = await import(
        "@/features/world-memory/trace/aggregateRest"
      );
      const result = await getGeographyAggregates({
        scope: { level: "country", countryCode: country.code },
        categories: categoriesResult,
      });
      return NextResponse.json({
        ...result,
        country: { code: country.code, label: country.name },
      });
    }

    if (view === "memories") {
      const categoriesResult = parseCategoriesParam(
        searchParams.get("categories"),
      );
      if ("error" in categoriesResult) {
        return NextResponse.json(
          { error: categoriesResult.error },
          { status: 400 },
        );
      }

      const countryRaw =
        searchParams.get("country")?.trim() ||
        searchParams.get("countryCode")?.trim() ||
        "";
      const regionRaw = searchParams.get("region")?.trim() || "";

      // Geography archive (Phase 3) — categorized Activities only.
      if (countryRaw && !locationId) {
        const country = findCountry(countryRaw);
        if (!country) {
          return NextResponse.json(
            { error: "Unknown country." },
            { status: 400 },
          );
        }
        const { listMemoriesForGeography } = await import(
          "@/features/world-memory/trace/aggregateRest"
        );
        const traces = await listMemoriesForGeography({
          countryCode: country.code,
          regionLabel: regionRaw || null,
          categories: categoriesResult,
          limit,
        });
        return NextResponse.json({
          traces,
          nextCursor: null,
          hasMore: false,
          scope: {
            countryCode: country.code,
            country: country.name,
            region: regionRaw || null,
            name: regionRaw || country.name,
          },
        });
      }

      if (!locationId) {
        return NextResponse.json(
          { error: "locationId or country is required." },
          { status: 400 },
        );
      }
      const page = await listTracesByLocationId({
        locationId,
        limit,
        cursor,
      });
      // Optional client-side category filter for city archive when requested.
      let traces = page.traces;
      if (searchParams.has("categories")) {
        const set = new Set(categoriesResult);
        traces = traces.filter(
          (pin) => pin.category && set.has(pin.category),
        );
      }
      return NextResponse.json({
        traces,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        scope: { locationId },
      });
    }

    if (view === "mine") {
      const header = request.headers.get("authorization") || "";
      if (!/^Bearer\s+/i.test(header)) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      const auth = await requireTraceUser(request);
      if (auth.error) return auth.error;
      if (auth.authType !== "google") {
        return NextResponse.json(
          { error: "Google sign-in is required." },
          { status: 401 },
        );
      }
      const { getMyMiavForUid } = await import(
        "@/features/world-memory/my-miav/myMiavRest"
      );
      // Read-only — never allocates Identity on page view.
      const mine = await getMyMiavForUid(auth.uid);
      return NextResponse.json(mine);
    }

    if (view === "status") {
      const header = request.headers.get("authorization") || "";
      if (!/^Bearer\s+/i.test(header)) {
        return NextResponse.json({
          posted: false,
          mine: null,
          miavId: null,
          postedWorkIds: [],
        });
      }

      const auth = await requireTraceUser(request);
      if (auth.error) return auth.error;

      const [postedWorkIds, mine, identity] = await Promise.all([
        listPostedWorkIds(auth.uid),
        getLatestPublicMemoryForUid(auth.uid),
        // Prefer existing Identity; do not allocate on status-only visits.
        (async () => {
          const { getMiavIdentity } = await import(
            "@/features/world-memory/trace/identityRest"
          );
          const existing = await getMiavIdentity(auth.uid);
          if (existing) return existing;
          // Legacy Google Trace miavId without Identity yet — surface for UI.
          const { getTraceByUid } = await import(
            "@/features/world-memory/trace/traceRest"
          );
          const legacy = await getTraceByUid(auth.uid);
          if (
            legacy?.authType === "google" &&
            legacy.miavId?.startsWith("MIAV-")
          ) {
            return { miavId: legacy.miavId };
          }
          return null;
        })(),
      ]);

      const miavId = identity?.miavId || mine?.miavId || null;

      return NextResponse.json({
        posted: postedWorkIds.length > 0 || Boolean(mine),
        mine,
        miavId,
        postedWorkIds,
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
  if (!/^Bearer\s+/i.test(header)) {
    return NextResponse.json(
      { error: "Google sign-in is required to leave a Memory." },
      { status: 401 },
    );
  }

  try {
    const locationResult = validatePostBody(payload);
    if ("error" in locationResult) {
      return NextResponse.json({ error: locationResult.error }, { status: 400 });
    }

    const { place, locationId } = locationResult;

    const auth = await requireTraceUser(request);
    if (auth.error) return auth.error;
    if (auth.authType !== "google") {
      return NextResponse.json(
        { error: "Google sign-in is required to leave a Memory." },
        { status: 401 },
      );
    }

    const categoryResult = validateCategoryWork(
      payload.category,
      payload.workId,
    );
    if (!categoryResult.ok) {
      return NextResponse.json({ error: categoryResult.error }, { status: 400 });
    }

    const messageResult = normalizeTraceMessage(
      payload.message,
      MAX_GOOGLE_MESSAGE_LENGTH,
    );
    if (!messageResult.ok) {
      return NextResponse.json({ error: messageResult.error }, { status: 400 });
    }

    const siteControl = await getSiteControl();
    if (!siteControl.traceEnabled) {
      return NextResponse.json(
        { error: TRACE_DISABLED_MESSAGE, code: "TRACE_DISABLED" },
        { status: 503 },
      );
    }

    // Ensure Identity exists (inherits Legacy miavId when present).
    await ensureMiavIdentity(auth.uid);

    const created = await createActivity({
      uid: auth.uid,
      category: categoryResult.category,
      workId: categoryResult.workId,
      locationId,
      country: place.country,
      region: "",
      city: place.name,
      message: messageResult.message,
    });

    return NextResponse.json({
      trace: created,
      miavId: created.miavId,
      ok: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save memory.";
    if (message === "ACTIVITY_EXISTS" || message === "TRACE_EXISTS") {
      return NextResponse.json(
        {
          error: "You already left a Memory for this work.",
          code: "ALREADY_POSTED_FOR_WORK",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
