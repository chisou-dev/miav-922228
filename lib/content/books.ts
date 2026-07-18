export type BookEdition = {
  id: string;
  label: string;
  status: "available" | "coming_soon";
  /**
   * Storefront URL (e.g. Amazon Kindle product page).
   * Leave null until the listing is ready; the UI will hide the link.
   */
  href: string | null;
  linkLabel?: string;
};

export type Book = {
  id: string;
  volume: number;
  title: string;
  description: string;
  editions: BookEdition[];
};

/**
 * Literary archive of published / forthcoming volumes.
 * Add new entries here as the project expands.
 */
export const books: Book[] = [
  {
    id: "miav-922228-volume-1",
    volume: 1,
    title: "MIAV-922228",
    description:
      "The first volume of a literary SF project about the relationship between humans and artificial intelligence.",
    editions: [
      {
        id: "kindle",
        label: "Digital Edition",
        status: "available",
        href: "https://www.amazon.com/dp/B0H34G694D",
        linkLabel: "Available on Amazon Kindle",
      },
      {
        id: "print",
        label: "Print Edition",
        status: "coming_soon",
        href: null,
      },
    ],
  },
];

export function getAllBooks(): Book[] {
  return books;
}
