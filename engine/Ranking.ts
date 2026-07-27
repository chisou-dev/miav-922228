import { Storage } from "@/engine/Storage";

export type RankingEntry = {
  score: number;
  at: string;
};

/** Local high-score table per game slug. */
export class Ranking {
  constructor(private readonly gameSlug: string) {}

  list(): RankingEntry[] {
    return Storage.get<RankingEntry[]>(`ranking:${this.gameSlug}`) ?? [];
  }

  submit(score: number) {
    const next: RankingEntry = { score, at: new Date().toISOString() };
    const merged = [...this.list(), next]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    Storage.set(`ranking:${this.gameSlug}`, merged);
  }
}
