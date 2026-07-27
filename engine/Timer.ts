type TimerHandle = number;

/** Browser-safe timers for game logic. */
export const Timer = {
  delay(ms: number, onFire: () => void): TimerHandle {
    return window.setTimeout(onFire, ms);
  },

  interval(ms: number, onTick: () => void): TimerHandle {
    return window.setInterval(onTick, ms);
  },

  clear(handle: TimerHandle) {
    window.clearTimeout(handle);
    window.clearInterval(handle);
  },
};
