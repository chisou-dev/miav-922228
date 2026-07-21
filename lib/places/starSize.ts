/** Star diameter in px from Memory count at a place. */
export function memoryStarSize(count: number): number {
  if (count >= 300) return 32;
  if (count >= 100) return 28;
  if (count >= 30) return 24;
  if (count >= 10) return 20;
  if (count >= 5) return 18;
  return 16;
}
