/**
 * BGM lifecycle flags — prevents BGM restarting during clear / result.
 */
let bgmSuppressed = false;

export function suppressBgm(value: boolean) {
  bgmSuppressed = value;
}

export function isBgmSuppressed() {
  return bgmSuppressed;
}
