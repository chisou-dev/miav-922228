/** Unlike the English-only legacy counter, this counts accented European-language words correctly. */
export function countWords(body: string): number {
  return (body.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? []).length;
}
