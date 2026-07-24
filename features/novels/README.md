# features/novels

Public books archive (`/books`) UI and the **canonical literary-works registry**.

Individual literary works live under `features/stories/<work-id>/`. This feature aggregates them — it does not own their content files.

---

## Architecture Contract

This architecture is considered **stable**.

Future changes must **extend** the existing registry-based system.

- Do **NOT** introduce parallel registries.
- Do **NOT** duplicate literary work metadata.
- Do **NOT** create separate reader-memory systems.

Every new literary project must integrate into the existing architecture rather than creating a new one.

---

## Architecture Stability

This architecture should be considered **mature**.

Do not redesign the architecture without a clear repository-wide benefit.

When implementing new literary features:

- Extend existing features.
- Extend existing registries.
- Extend existing reusable components.

Avoid introducing additional layers of abstraction unless they eliminate significant duplication across multiple literary projects.

Repository-wide consistency takes priority over feature-specific convenience.

---

## Migration Policy

The feature-based architecture migration has been **completed**.

Do not recreate legacy structures such as:

- `lib/`
- `components/`

for feature-specific implementations.

New implementation code belongs inside the owning feature.

Thin App Router wrappers under `app/` are expected.

---

## Repository Philosophy

The repository is designed around **literary works**, not individual pages.

- Each literary work owns its own data.
- Shared functionality belongs in reusable feature components.
- The homepage, books, reader memory, and future reader-facing features should discover literary works through the central registry whenever possible.

The less code that must change to add a new literary work, the better the architecture.

---

## Evolution Policy

The architecture should evolve by **extending existing modules** whenever possible.

Before creating a new file, registry, or reusable component, first determine whether the requirement can be implemented by extending an existing one.

Prefer **fewer concepts** over more concepts.

---

## AI Implementation Policy

When implementing new literary features, prefer **extending** the existing architecture over creating new abstractions.

- If an existing registry or reusable component can be extended, **reuse it**.
- Creating new registries, duplicate metadata, or parallel systems requires a **strong architectural justification**.

---

## AI Contributor Guideline

Before introducing a new abstraction, ask:

- Can an existing registry be extended?
- Can an existing reusable component be extended?
- Can the existing feature own this responsibility?

If the answer is yes, extend the existing implementation.

Creating parallel systems should be treated as a **last resort**.

---

## Backward Compatibility Policy

The existing architecture should be treated as the **canonical** implementation.

When adding new literary projects, new reader features, or homepage sections:

- Prefer extending the existing registry.
- Prefer extending existing reusable components.
- Preserve existing behavior whenever possible.

When extending the architecture, preserve existing behavior whenever possible. Changes should be **additive** rather than disruptive.

Avoid introducing new systems unless the existing architecture cannot reasonably support the requirement.

Architectural consistency is more important than short-term implementation convenience.

---

## Repository Principle

This repository favors **long-term maintainability** over feature-specific optimizations.

If a solution works for every literary project, it is preferred over a solution that works only for one project.

---

## Feature Ownership

Each feature owns its own data, UI, and business logic.

Other features should consume **public interfaces** instead of copying implementations.

---

## Keep It Predictable

Future contributors should be able to guess where new code belongs.

If adding a new literary work requires changes in many unrelated places, reconsider the design.

A new literary work should normally require only:

1. Create `features/stories/<work-id>/`
2. Register it in `features/novels/literaryWorks.ts`

Everything else should discover it automatically.

---

## Single source of truth

Every literary work must be registered **exactly once**.

Every piece of literary metadata must have **exactly one owner**.

If metadata already exists somewhere in the repository, **reuse it**.

Never duplicate the same information in multiple places.

**Canonical registry:**

`features/novels/literaryWorks.ts`

Do **not** create additional work registries.

---

## Adding a new literary work

To add a new work:

1. **Create** `features/stories/<work-id>/work.ts`  
   This file owns the work metadata, for example:
   - title
   - description
   - chapter order (reading-order slugs)
   - book metadata
   - anything else specific to that work

2. **Register** that work in `features/novels/literaryWorks.ts`

Nothing else should be required for the work to be discoverable.

### Examples of future work ids

- `japan-8000hz` (JAPAN 8000Hz)
- `fourth-period` (Fourth Period)
- `scarlet-thread` (Scarlet Thread)
- any later project

For every future literary project, the **only required implementation steps** are:

1. Create `features/stories/<work-id>/work.ts`
2. Register it in `features/novels/literaryWorks.ts`

Everything else (Reader Memory, homepage, books, future reader features) must discover the work through this registry.

- Do not introduce additional registries.
- Do not duplicate metadata.

---

## ReaderMemory

`features/core/ReaderMemory.tsx` must **never** be edited when a new work is added.

It receives **only** `workId`:

```tsx
<ReaderMemory workId="miav-922228" />
```

ReaderMemory resolves title, ordered chapters, and related display data from:

`features/novels/literaryWorks.ts`

Do **not** pass:

- `workTitle`
- `chapterSlugs`
- or other work metadata as props

---

## Books

Books pages must resolve works from:

`features/novels/literaryWorks.ts`

Do not duplicate book metadata in page components or parallel registries. Work-owned book metadata belongs in `features/stories/<work-id>/` and is surfaced through the canonical registry (or modules the registry re-exports).

---

## Future homepage

Homepage sections must resolve work information from the same registry.

Do **not** hardcode work titles (or other work-specific copy that belongs in the registry / `work.ts`) when wiring multi-work UI.

---

## Local reader memory

Use **only**:

`localStorage.reader_memory`

Never create additional `localStorage` keys for literary works.

| Scope | Fields |
|--------|--------|
| Global | `firstVisit`, `lastVisit` |
| Per work | `reader_memory.works[workId]` (e.g. `lastChapter`, `traceLeft`, `finished`) |

Chapter **counts** are not stored permanently; they are derived from `lastChapter` against the work’s ordered chapter list in the registry.

---

## Architecture rule (summary)

| Do | Don’t |
|----|--------|
| Own metadata in `features/stories/<work-id>/work.ts` | Scatter the same metadata across pages |
| Register once in `literaryWorks.ts` | Add a second works registry |
| Use `<ReaderMemory workId="…" />` only | Pass title / chapter lists into ReaderMemory |
| Use `reader_memory` + `works[workId]` | New localStorage keys per work |

Current registered work: **MIAV-922228** (`miav-922228`) via `features/stories/miav/work.ts`.
