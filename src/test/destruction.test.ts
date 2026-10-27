import { describe, expect, it } from "vitest";

import {
  clamp01,
  easeInCubic,
  easeOutBack,
  easeOutQuint,
  elapsed,
  jitter,
  knockTime,
  overlayVars,
  PHASE,
  progress,
  pulse,
  smoothstep,
  WAVE_SPEED,
} from "@/components/space/destruction";
import { ORBIT_SLOTS } from "@/components/space/planets";

/** The displacement factor SpaceScene applies to a planet: 0 -> 1 -> 0. */
function away(t: number, orbitRadius: number): number {
  const knock = knockTime(orbitRadius);
  if (t < knock) return 0;
  return (
    easeOutQuint(progress(t, knock, PHASE.voidEnd)) *
    (1 - smoothstep(progress(t, PHASE.voidEnd, PHASE.reformEnd)))
  );
}

describe("destruction timeline", () => {
  it("runs its phases in order", () => {
    const { impact, blastEnd, voidEnd, reformEnd, total } = PHASE;

    expect(impact).toBeLessThan(blastEnd);
    expect(blastEnd).toBeLessThan(voidEnd);
    expect(voidEnd).toBeLessThan(reformEnd);
    expect(reformEnd).toBeLessThan(total);
  });

  it("sweeps the blast front past every orbit before the blast phase ends", () => {
    for (const slot of ORBIT_SLOTS) {
      expect(knockTime(slot.orbitRadius)).toBeLessThan(PHASE.blastEnd);
    }
  });

  it("knocks planets loose from the inside out", () => {
    const times = ORBIT_SLOTS.map((s) => knockTime(s.orbitRadius));

    expect(times).toEqual([...times].sort((a, b) => a - b));
    // the sweep should be spread out, not effectively simultaneous
    expect(times.at(-1)! - times[0]!).toBeGreaterThan(0.5);
  });

  it("never knocks a planet before the impact", () => {
    for (const slot of ORBIT_SLOTS) {
      expect(knockTime(slot.orbitRadius)).toBeGreaterThan(PHASE.impact);
    }
  });

  it("gives the front a speed that matches the knock times", () => {
    // The visible ring is drawn at age * WAVE_SPEED, so a planet must be
    // reached exactly when the ring's radius equals its orbit.
    for (const slot of ORBIT_SLOTS) {
      const ringRadiusAtKnock = (knockTime(slot.orbitRadius) - PHASE.impact) * WAVE_SPEED;

      expect(ringRadiusAtKnock).toBeCloseTo(slot.orbitRadius, 6);
    }
  });
});

describe("planet displacement", () => {
  it("starts at rest, so nothing twitches when the front arrives", () => {
    for (const slot of ORBIT_SLOTS) {
      expect(away(knockTime(slot.orbitRadius), slot.orbitRadius)).toBe(0);
    }
  });

  it("returns every planet exactly to its orbit by the end of the reform", () => {
    for (const slot of ORBIT_SLOTS) {
      expect(away(PHASE.reformEnd, slot.orbitRadius)).toBe(0);
      // and stays there for the remainder of the sequence
      expect(away(PHASE.total, slot.orbitRadius)).toBe(0);
    }
  });

  it("throws each planet furthest around the end of the void phase", () => {
    const slot = ORBIT_SLOTS[0]!;
    const peak = away(PHASE.voidEnd, slot.orbitRadius);

    expect(peak).toBeGreaterThan(0.9);
    expect(peak).toBeGreaterThan(away(PHASE.blastEnd, slot.orbitRadius));
    expect(peak).toBeGreaterThan(away(PHASE.reformEnd - 0.5, slot.orbitRadius));
  });

  it("moves monotonically outward, then monotonically home", () => {
    const slot = ORBIT_SLOTS.at(-1)!;
    const knock = knockTime(slot.orbitRadius);
    const sample = (from: number, to: number) =>
      Array.from({ length: 24 }, (_, i) => away(from + ((to - from) * i) / 23, slot.orbitRadius));

    const out = sample(knock, PHASE.voidEnd);
    for (let i = 1; i < out.length; i++) expect(out[i]!).toBeGreaterThanOrEqual(out[i - 1]!);

    const back = sample(PHASE.voidEnd, PHASE.reformEnd);
    for (let i = 1; i < back.length; i++) expect(back[i]!).toBeLessThanOrEqual(back[i - 1]!);
  });

  it("keeps the displacement bounded to 0..1 across the whole sequence", () => {
    for (const slot of ORBIT_SLOTS) {
      for (let t = 0; t <= PHASE.total; t += 0.05) {
        const a = away(t, slot.orbitRadius);

        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("easing helpers", () => {
  it("pins the standard easings to 0 and 1 at their endpoints", () => {
    for (const fn of [easeInCubic, easeOutQuint, smoothstep, easeOutBack]) {
      expect(fn(0)).toBeCloseTo(0, 10);
      expect(fn(1)).toBeCloseTo(1, 10);
    }
  });

  it("lets easeOutBack overshoot, which is what gives the sun its snap", () => {
    const peak = Math.max(...Array.from({ length: 50 }, (_, i) => easeOutBack(i / 49)));

    expect(peak).toBeGreaterThan(1);
  });

  it("clamps progress outside its window", () => {
    expect(progress(-5, 0, 2)).toBe(0);
    expect(progress(99, 0, 2)).toBe(1);
    expect(progress(1, 0, 2)).toBeCloseTo(0.5, 10);
  });

  it("returns a pulse to zero at both ends of its window", () => {
    expect(pulse(1, 1, 2)).toBeCloseTo(0, 10);
    expect(pulse(2, 1, 2)).toBeCloseTo(0, 10);
    expect(pulse(1.5, 1, 2)).toBeCloseTo(1, 10);
  });

  it("clamps to the unit range", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
  });

  it("produces repeatable jitter inside -1..1", () => {
    expect(jitter(4.2)).toBe(jitter(4.2));
    for (let i = 0; i < 200; i++) {
      const v = jitter(i * 1.7);

      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
    // neighbouring seeds must not correlate, or the scatter looks banded
    expect(Math.abs(jitter(1) - jitter(2))).toBeGreaterThan(0.01);
  });
});

describe("elapsed", () => {
  it("is null while the sequence is not running", () => {
    expect(elapsed(null)).toBeNull();
  });

  it("reports seconds since the trigger", () => {
    expect(elapsed(1000, 4500)).toBeCloseTo(3.5, 10);
  });
});

describe("overlayVars", () => {
  it("hands the overlay every variable the stylesheet reads", () => {
    const vars = overlayVars();

    for (const key of [
      "--d-total",
      "--d-impact",
      "--d-flash",
      "--d-dark-start",
      "--d-dark",
      "--d-msg-start",
      "--d-msg",
      "--d-shake",
    ]) {
      expect(vars[key], `${key} missing`).toMatch(/^[\d.]+s$/);
    }
  });

  it("keeps the vignette lifting until the planets are home", () => {
    const vars = overlayVars();
    const darkEnds = parseFloat(vars["--d-dark-start"]!) + parseFloat(vars["--d-dark"]!);

    // These animations hold their last keyframe, so a window that ends early
    // would leave the screen dark over the reassembly.
    expect(darkEnds).toBeGreaterThanOrEqual(PHASE.reformEnd);
  });

  it("finishes the status readout within the sequence", () => {
    const vars = overlayVars();
    const secs = (k: string) => parseFloat(vars[k]!);

    expect(secs("--d-msg-start") + secs("--d-msg")).toBeLessThanOrEqual(PHASE.total);
    expect(secs("--d-dark-start") + secs("--d-dark")).toBeLessThanOrEqual(PHASE.total);
    expect(secs("--d-total")).toBe(PHASE.total);
  });
});
