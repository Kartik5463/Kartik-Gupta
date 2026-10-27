// Timeline for the "destroy simulation" sequence.
//
// One source of truth, shared by the 3D scene (SpaceScene) and the DOM overlay
// (index.tsx / styles.css). The overlay gets these numbers as CSS custom
// properties and drives each layer with its own delay + duration, so nothing
// has to be kept in sync by hand.

/** Seconds from the moment the button is pressed. */
export const PHASE = {
  /** Asteroid falls toward the sun; the scene starts to tremble. */
  impact: 1.4,
  /** Shockwave finishes sweeping the system. */
  blastEnd: 3.2,
  /** Everything has flown apart and gone dark. */
  voidEnd: 5.2,
  /** Planets have eased back into their orbits and the sun has relit. */
  reformEnd: 8.2,
  /** Overlay is gone and the scene is fully back to normal. */
  total: 9.2,
} as const;

/** How fast the blast front travels outward, in world units per second.
 *  Tuned so it clears the outermost orbit by `blastEnd`. */
export const WAVE_SPEED = 13.5;

/** When the front reaches a given orbit — planets are knocked out in sequence
 *  from the inside out rather than all at once. */
export function knockTime(orbitRadius: number): number {
  return PHASE.impact + orbitRadius / WAVE_SPEED;
}

/* ---------- easing ---------- */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 0..1 progress across a window, clamped at both ends. */
export function progress(t: number, from: number, to: number): number {
  return clamp01((t - from) / (to - from));
}

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInCubic = (t: number) => t * t * t;
export const easeOutQuint = (t: number) => 1 - (1 - t) ** 5;
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
/** Overshoots past 1 before settling — used for the sun snapping back alight. */
export const easeOutBack = (t: number) => {
  const c = 1.7;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

/** Rises to 1 and falls back to 0 across the window — for flashes and pulses. */
export function pulse(t: number, from: number, to: number): number {
  const p = progress(t, from, to);
  return Math.sin(p * Math.PI);
}

/** A deterministic -1..1 value; used for per-planet tumble so the sequence
 *  looks chaotic but replays identically. */
export function jitter(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/** The CSS custom properties the overlay reads, derived from PHASE. */
export function overlayVars(): Record<string, string> {
  return {
    "--d-total": `${PHASE.total}s`,
    "--d-impact": `${PHASE.impact}s`,
    "--d-flash": `${(PHASE.blastEnd - PHASE.impact) * 0.45}s`,
    "--d-dark-start": `${PHASE.impact}s`,
    // Runs all the way to the end of the reform: the vignette has to lift as
    // the planets come back, not hold over them.
    "--d-dark": `${PHASE.reformEnd - PHASE.impact}s`,
    "--d-msg-start": `${PHASE.blastEnd - 0.4}s`,
    "--d-msg": `${PHASE.reformEnd - PHASE.blastEnd + 0.4}s`,
    "--d-shake": `${PHASE.blastEnd - PHASE.impact}s`,
  };
}

/** Seconds since the sequence was triggered, or null when it isn't running. */
export function elapsed(destroyAt: number | null, now = performance.now()): number | null {
  if (destroyAt === null) return null;
  return (now - destroyAt) / 1000;
}
