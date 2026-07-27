/** Web Audio scaffold — mute-by-default until a game opts in. */
export class Audio {
  private muted = true;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  play(_id: string) {
    if (this.muted) return;
  }
}
