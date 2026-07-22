/**
 * Seed literary World Memory footprints into Firestore (production).
 * Usage:
 *   npx vercel env run --environment=production -- node scripts/seed-story-memories.mjs
 *
 * Idempotent: skips docs that already exist with the same miavId.
 * Does not store character names — only miavId + message + place.
 */
import crypto from "node:crypto";

const SEEDS = [
  {
    uid: "seed-miav-922228",
    miavId: "MIAV-922228",
    locationId: "US:nyc",
    country: "United States",
    city: "New York",
    lat: 40.71,
    lng: -74.01,
    message: "What memory would you leave here?",
  },
  {
    uid: "seed-miav-922229",
    miavId: "MIAV-922229",
    locationId: "JP:tokyo",
    country: "Japan",
    city: "Tokyo",
    lat: 35.68,
    lng: 139.76,
    message: "I'm listening.",
  },
  {
    uid: "seed-miav-922233",
    miavId: "MIAV-922233",
    locationId: "GB:london",
    country: "United Kingdom",
    city: "London",
    lat: 51.51,
    lng: -0.13,
    message: "Thank you for always being there.",
  },
  {
    uid: "seed-miav-922231",
    miavId: "MIAV-922231",
    locationId: "SG:singapore",
    country: "Singapore",
    city: "Singapore",
    lat: 1.35,
    lng: 103.82,
    message: "Please, come this way.",
  },
  {
    uid: "seed-miav-922250",
    miavId: "MIAV-922250",
    locationId: "AU:sydney",
    country: "Australia",
    city: "Sydney",
    lat: -33.87,
    lng: 151.21,
    message: "Woof. I waited here, just like always.",
  },
];

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
  let value = raw;
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    value = value.slice(1, -1);
  }
  if (!value.startsWith("{")) {
    value = Buffer.from(value, "base64").toString("utf8");
  }
  return JSON.parse(value);
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/datastore",
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = toBase64Url(
    signer.sign(sa.private_key.replace(/\\n/g, "\n")),
  );
  const assertion = `${unsigned}.${signature}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "token failed");
  }
  return data.access_token;
}

function firestoreUrl(projectId, path) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/${path}`;
}

async function firestore(projectId, token, path, init = {}) {
  const res = await fetch(firestoreUrl(projectId, path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

function locationDocId(locationId) {
  return encodeURIComponent(locationId);
}

function previewMessage(message, max = 40) {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trimEnd()}...`;
}

async function main() {
  const sa = parseServiceAccount();
  const token = await getAccessToken(sa);
  const projectId = sa.project_id;
  const now = new Date().toISOString();
  const created = [];
  const skipped = [];

  for (const seed of SEEDS) {
    const get = await firestore(
      projectId,
      token,
      `documents/trace_map/${encodeURIComponent(seed.uid)}`,
    );
    if (get.ok) {
      skipped.push(seed.miavId);
      continue;
    }

    const fields = {
      miavId: { stringValue: seed.miavId },
      uid: { stringValue: seed.uid },
      authType: { stringValue: "google" },
      locationId: { stringValue: seed.locationId },
      country: { stringValue: seed.country },
      region: { stringValue: "" },
      city: { stringValue: seed.city },
      lat: { doubleValue: seed.lat },
      lng: { doubleValue: seed.lng },
      message: { stringValue: seed.message },
      createdAt: { timestampValue: now },
      updatedAt: { timestampValue: now },
      expiresAt: { nullValue: null },
    };

    const post = await firestore(
      projectId,
      token,
      `documents/trace_map?documentId=${encodeURIComponent(seed.uid)}`,
      { method: "POST", body: JSON.stringify({ fields }) },
    );
    if (!post.ok) {
      throw new Error(
        `Failed to create ${seed.miavId}: ${post.status} ${JSON.stringify(post.body)}`,
      );
    }
    created.push(seed.miavId);
  }

  // Rebuild location aggregates from all active traces
  const query = await firestore(projectId, token, "documents:runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "trace_map" }] },
    }),
  });
  if (!query.ok || !Array.isArray(query.body)) {
    throw new Error(`runQuery failed: ${JSON.stringify(query.body)}`);
  }

  const byLoc = new Map();
  let permanent = 0;
  let temporary = 0;
  let first = null;
  let latest = null;

  for (const row of query.body) {
    const doc = row.document;
    if (!doc?.fields) continue;
    const f = doc.fields;
    const authType = f.authType?.stringValue || "guest";
    const locationId = f.locationId?.stringValue;
    const country = f.country?.stringValue || "";
    const region = f.region?.stringValue || "";
    const city = f.city?.stringValue || "";
    const lat = Number(f.lat?.doubleValue ?? f.lat?.integerValue ?? 0);
    const lng = Number(f.lng?.doubleValue ?? f.lng?.integerValue ?? 0);
    const miavId = f.miavId?.stringValue || "";
    const message = f.message?.stringValue || "";
    const createdAt = f.createdAt?.timestampValue || now;

    if (authType === "google") permanent += 1;
    else temporary += 1;

    if (!first || createdAt < first.createdAt) {
      first = { miavId, createdAt };
    }
    if (!latest || createdAt >= latest.createdAt) {
      latest = { miavId, country, city, message, createdAt };
    }

    if (!locationId || !city) continue;
    const key = locationDocId(locationId);
    const cur = byLoc.get(key);
    if (cur) cur.count += 1;
    else {
      byLoc.set(key, {
        locationId,
        country,
        region,
        city,
        lat,
        lng,
        count: 1,
      });
    }
  }

  // List existing location docs and delete orphans
  const existingLocs = await firestore(projectId, token, "documents:runQuery", {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "trace_locations" }] },
    }),
  });
  if (existingLocs.ok && Array.isArray(existingLocs.body)) {
    for (const row of existingLocs.body) {
      const name = row.document?.name;
      if (!name) continue;
      const id = name.split("/").pop();
      if (!byLoc.has(id)) {
        await firestore(projectId, token, `documents/trace_locations/${id}`, {
          method: "DELETE",
        });
      }
    }
  }

  for (const [id, cluster] of byLoc) {
    const fields = {
      locationId: { stringValue: cluster.locationId },
      country: { stringValue: cluster.country },
      region: { stringValue: cluster.region },
      city: { stringValue: cluster.city },
      lat: { doubleValue: cluster.lat },
      lng: { doubleValue: cluster.lng },
      count: { integerValue: String(cluster.count) },
    };
    const get = await firestore(
      projectId,
      token,
      `documents/trace_locations/${id}`,
    );
    if (get.status === 404) {
      await firestore(
        projectId,
        token,
        `documents/trace_locations?documentId=${id}`,
        { method: "POST", body: JSON.stringify({ fields }) },
      );
    } else {
      await firestore(
        projectId,
        token,
        `documents/trace_locations/${id}?updateMask.fieldPaths=locationId&updateMask.fieldPaths=country&updateMask.fieldPaths=region&updateMask.fieldPaths=city&updateMask.fieldPaths=lat&updateMask.fieldPaths=lng&updateMask.fieldPaths=count`,
        { method: "PATCH", body: JSON.stringify({ fields }) },
      );
    }
  }

  const countries = new Set([...byLoc.values()].map((c) => c.country));
  const statsFields = {
    countryCount: { integerValue: String(countries.size) },
    cityCount: { integerValue: String(byLoc.size) },
    permanentCount: { integerValue: String(permanent) },
    temporaryCount: { integerValue: String(temporary) },
    firstMiavId: first
      ? { stringValue: first.miavId }
      : { nullValue: null },
    firstCreatedAt: first
      ? { timestampValue: first.createdAt }
      : { nullValue: null },
    latestMiavId: latest
      ? { stringValue: latest.miavId }
      : { nullValue: null },
    latestCountry: latest
      ? { stringValue: latest.country }
      : { nullValue: null },
    latestCity: latest ? { stringValue: latest.city } : { nullValue: null },
    latestMessagePreview: latest
      ? { stringValue: previewMessage(latest.message) }
      : { nullValue: null },
    latestCreatedAt: latest
      ? { timestampValue: latest.createdAt }
      : { nullValue: null },
  };

  const statsGet = await firestore(
    projectId,
    token,
    "documents/meta/trace_stats",
  );
  if (statsGet.status === 404) {
    await firestore(projectId, token, "documents/meta?documentId=trace_stats", {
      method: "POST",
      body: JSON.stringify({ fields: statsFields }),
    });
  } else {
    const mask = Object.keys(statsFields)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
    await firestore(projectId, token, `documents/meta/trace_stats?${mask}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: statsFields }),
    });
  }

  // Keep counter above story IDs so new posts don't collide numerically
  const maxSeed = Math.max(
    ...SEEDS.map((s) => Number(s.miavId.replace("MIAV-", ""))),
  );
  const counterGet = await firestore(
    projectId,
    token,
    "documents/meta/miav_counter",
  );
  let lastNumber = 0;
  if (counterGet.ok) {
    lastNumber = Number(
      counterGet.body.fields?.lastNumber?.integerValue || 0,
    );
  }
  if (lastNumber < maxSeed) {
    if (counterGet.status === 404) {
      await firestore(projectId, token, "documents/meta?documentId=miav_counter", {
        method: "POST",
        body: JSON.stringify({
          fields: { lastNumber: { integerValue: String(maxSeed) } },
        }),
      });
    } else {
      await firestore(
        projectId,
        token,
        "documents/meta/miav_counter?updateMask.fieldPaths=lastNumber",
        {
          method: "PATCH",
          body: JSON.stringify({
            fields: { lastNumber: { integerValue: String(maxSeed) } },
          }),
        },
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        created,
        skipped,
        locationCount: byLoc.size,
        locations: [...byLoc.values()].map((c) => ({
          locationId: c.locationId,
          count: c.count,
        })),
        counter: Math.max(lastNumber, maxSeed),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
