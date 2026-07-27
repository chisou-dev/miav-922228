/** Mutable run score — clone per session in each game. */
export class Score {
  constructor(private value = 0) {}

  add(points: number) {
    this.value += points;
  }

  get current() {
    return this.value;
  }

  reset() {
    this.value = 0;
  }
}
