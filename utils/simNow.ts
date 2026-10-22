/**
 * Simulated "now".
 *
 * Inside a SimProvider the operator can pick what date/time the game thinks it
 * is. The provider stores a chosen wall-clock point on the sim session; this
 * module keeps the offset between sim-now and real-now so the simulated clock
 * keeps advancing at real pace once set.
 *
 * `nowDate()`/`nowMs()` are drop-in replacements for `new Date()`/`Date.now()`
 * inside the game tree. Outside a mounted SimProvider the offset is 0 and they
 * behave identically.
 */

let simOffsetMs = 0;
let simTargetMs: number | null = null;
const listeners = new Set<() => void>();

export const setSimNow = (simNowMs: number | null | undefined) => {
  const target = simNowMs ?? null;
  const changed = target !== simTargetMs;
  simTargetMs = target;
  simOffsetMs = simNowMs == null ? 0 : simNowMs - Date.now();
  if (changed) {
    listeners.forEach((cb) => cb());
  }
};

export const simNowOffsetMs = () => simOffsetMs;

/** Fires when the simulated clock is re-pointed (date picked / reset to real). */
export const onSimNowChange = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export const nowMs = () => Date.now() + simOffsetMs;

export const nowDate = () => new Date(nowMs());
