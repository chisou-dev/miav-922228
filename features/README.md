# Features

Domain modules for the single Next.js app at the repo root.

**Rules**

- Deploy remains one Next.js application (`app/` owns URLs).
- Do not change routes, UI, APIs, SEO, Firestore, or Firebase config while migrating.
- Application code moves here in later phases; Phase 0 only adds ownership docs.

| Folder | Role |
|--------|------|
| `core/` | Homepage composition, external games link |
| `shared/` | Site chrome and cross-cutting helpers |
| `firebase/` | Firebase client/admin infra |
| `auth/` | Shared ID-token verification |
| `contact/` | Contact form and related server helpers |
| `dashboard/` | Admin UI and site-control |
| `novels/` | `/books` archive UI + story registry |
| `stories/` | One module per literary work |
| `world-memory/` | Trace Map product (`/world-map`) |
| `signals/` | MIAV Signal System V1 (`/signals`) |

Games live in the separate **miav-games** repository — miav-site only links out via `features/core/gamesUrl.ts`.

---

## Luminous Structure Signal Integration

Phase 6A prepares the MIAV-side contract for a future **Luminous Structure** game.
The game itself is not in this repo yet.

### Identity note

| Concept | ID | Role |
|---------|----|------|
| MIAV World work | `luminous-structure` | Map / Leave a Memory workId (currently **disabled**) |
| Signal targetApp | `luminous` | Cross-app Signal redeem target |

Do not conflate these.

### Redeem contract (formal)

1. **targetApp** = `luminous`
2. **Endpoint** = `POST /api/signals/redeem`
3. **Request body** (only):

```json
{
  "code": "MIAV-N14-XXXX-XXXX",
  "targetApp": "luminous"
}
```

No Google Auth, Firebase UID, MIAV ID, email, or tokens.

4. **Success response**:

```json
{
  "valid": true,
  "signalId": "novel-chapter-14",
  "rewardId": "light-style-novel-14",
  "targetApp": "luminous"
}
```

5. **Error response** (examples):

```json
{ "valid": false, "reason": "INVALID_FORMAT" }
{ "valid": false, "reason": "UNKNOWN_SIGNAL" }
{ "valid": false, "reason": "NOT_AVAILABLE_FOR_TARGET" }
{ "valid": false, "reason": "SERVER_ERROR" }
```

6. **First reward**: Chapter 14 Signal → `light-style-novel-14` (“Chapter 14 Light”).
   Mapping lives only in `features/signals/rewards.ts` (`SIGNAL_REWARDS`).

7. **Luminous-side persistence**: After `valid: true`, the Luminous client stores
   `rewardId` in its own localStorage / IndexedDB (e.g. `unlockedRewards`).
   MIAV does **not** track per-device unlocks for Luminous.

8. **Google Auth is not required** on the Luminous client for redeem.

9. **Codes** are copied from My MIAV after Signal claim. Paste into Luminous.

10. **Codes are not single-use.** The same HMAC code remains a valid key for every
    device/player. “Already unlocked” is decided by Luminous local state, not by
    invalidating the code worldwide.

### Client helper (this repo)

```ts
import {
  LUMINOUS_SIGNAL_TARGET,
  redeemLuminousSignal,
  getLuminousReward,
} from "@/features/signals/integrations/luminous";
```

### CORS (Phase 6B)

`POST` / `OPTIONS` `/api/signals/redeem` only — not other Signal APIs.

Allowlist includes Writer Memo production (`https://writer-memo.vercel.app`),
local Vite ports (`5173` / `4173`), and MIAV same-origin hosts.
Optional extras: `SIGNAL_REDEEM_CORS_ORIGINS` (comma-separated; never `*`).

Do **not** use `Access-Control-Allow-Origin: *`. Credentials are not used.
Disallowed browser `Origin` → `403` without CORS allow headers.
No-`Origin` / server-to-server requests keep the previous redeem behavior.

### Future game unlock mapping (Luminous repo)

```text
light-style-novel-14  →  Chapter 14 dedicated light style
```

Add further `SIGNAL_REWARDS` rows for new Signals; avoid hardcoding if-ladders in the API.
