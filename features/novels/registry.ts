import type { Book } from "@/features/stories/miav/books";
import { miavBooks } from "@/features/stories/miav/books";

export type { Book, BookEdition } from "@/features/stories/miav/books";

/**
 * Public books archive registry.
 * Aggregates literary work modules without owning their metadata.
 */
export function getAllBooks(): Book[] {
  return [...miavBooks];
}
