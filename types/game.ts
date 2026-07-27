export type GameStatus = "available" | "coming-soon";

/** Library list entry — playable games have a slug; placeholders do not. */
export type GameCatalogItem =
  | {
      slug: string;
      title: string;
      status: "available";
      description?: string;
    }
  | {
      slug: null;
      title: string;
      status: "coming-soon";
      description?: string;
    };

export type GameConfig = {
  slug: string;
  title: string;
  description?: string;
};
