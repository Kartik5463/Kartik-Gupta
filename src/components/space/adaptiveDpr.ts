// Picks the 3D canvas's render resolution (device pixel ratio) from the frame
// rate the device actually achieves.
//
// Phones have 2-3x dense screens, so rendering at 1x looks blurry, but 2x means
// four times the pixels — fine on most phones, too much for some. This starts
// sharp and backs off only when that measurably helps.
//
// Frame rate alone is a misleading signal: a phone in power-saving mode caps
// every page at 30fps, and a CPU-bound phone is slow at any resolution. Cutting
// resolution there would blur the page for nothing. So the first time the
// device struggles, the controller probes: it drops straight to the minimum
// for a moment. If even that doesn't raise the frame rate, resolution isn't the
// bottleneck, so it snaps back to sharp and stops adjusting. If it does help,
// it settles halfway and fine-tunes a step at a time from there.
//
// Probing all the way down matters: with vsync, frame rate moves in plateaus,
// so one small step can show no gain even when a bigger cut would.
//
// Pure functions with no browser APIs, so every case is unit-tested.

export interface DprState {
  dpr: number;
  min: number;
  max: number;
  /** One-second windows still to skip while the scene finishes starting up. */
  warmup: number;
  /** Windows to skip after a resolution change, while the canvas resizes. */
  settle: number;
  /** A probe to the minimum awaiting its verdict: where it came from and the fps then. */
  trial: { from: number; fps: number } | null;
  /** The probe showed resolution affects frame rate, so step-by-step tuning is on. */
  adaptive: boolean;
  /** Set when a step up is awaiting its verdict: the resolution to go back to. */
  raisedFrom: number | null;
  /** Consecutive windows at full speed, which earns a step back up. */
  good: number;
  /** Step-ups that had to be undone; past the limit we stop trying. */
  failedRaises: number;
  /** Lowering resolution was shown not to help, so it's no longer tried. */
  locked: boolean;
}

export const DPR_STEP = 0.25;
/** Below this the device is struggling. */
export const LOW_FPS = 50;
/** At or above this a 60Hz display is running at full speed. */
export const HIGH_FPS = 57;
/** The probe must raise the frame rate by at least this factor to count. */
export const MIN_GAIN = 1.1;
/** Full-speed windows needed before trying a higher resolution again. */
export const RAISE_AFTER = 8;
export const MAX_FAILED_RAISES = 2;

const round = (v: number) => Math.round(v * 100) / 100;

export function initialDprState(dpr: number, min: number, max: number): DprState {
  return {
    dpr: Math.min(max, Math.max(min, dpr)),
    min,
    max,
    warmup: 2,
    settle: 0,
    trial: null,
    adaptive: false,
    raisedFrom: null,
    good: 0,
    failedRaises: 0,
    locked: false,
  };
}

/** Feeds one second's frame rate in and returns the next state. */
export function nextDpr(s: DprState, fps: number): DprState {
  if (s.warmup > 0) return { ...s, warmup: s.warmup - 1 };
  if (s.settle > 0) return { ...s, settle: s.settle - 1 };

  // Judge the probe.
  if (s.trial) {
    if (fps < s.trial.fps * MIN_GAIN) {
      // Even the minimum didn't help: resolution isn't what's holding it back
      // (a capped display or a busy CPU). Back to sharp, and stop adjusting.
      return { ...s, dpr: s.trial.from, trial: null, locked: true, settle: 1, good: 0 };
    }
    // Resolution matters. Start tuning from halfway back up.
    const dpr = Math.max(
      s.min,
      round(Math.round((s.min + s.trial.from) / 2 / DPR_STEP) * DPR_STEP),
    );
    return { ...s, dpr, trial: null, adaptive: true, settle: 1, good: 0 };
  }

  // Judge a pending step up.
  if (s.raisedFrom !== null) {
    if (fps < LOW_FPS) {
      return {
        ...s,
        dpr: s.raisedFrom,
        raisedFrom: null,
        failedRaises: s.failedRaises + 1,
        settle: 1,
        good: 0,
      };
    }
    s = { ...s, raisedFrom: null };
  }

  if (fps < LOW_FPS) {
    if (s.locked || s.dpr <= s.min) return { ...s, good: 0 };
    if (!s.adaptive) {
      return { ...s, dpr: s.min, trial: { from: s.dpr, fps }, settle: 1, good: 0 };
    }
    return { ...s, dpr: Math.max(s.min, round(s.dpr - DPR_STEP)), settle: 1, good: 0 };
  }

  if (fps >= HIGH_FPS) {
    const good = s.good + 1;
    if (good >= RAISE_AFTER && s.dpr < s.max && s.failedRaises < MAX_FAILED_RAISES) {
      const dpr = Math.min(s.max, round(s.dpr + DPR_STEP));
      return { ...s, dpr, raisedFrom: s.dpr, good: 0, settle: 1 };
    }
    return { ...s, good };
  }

  return { ...s, good: 0 };
}
