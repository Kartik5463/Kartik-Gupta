import { describe, expect, it } from "vitest";

import { BELT_INNER, MAX_PLANETS, ORBIT_SLOTS, planetFootprint } from "@/components/space/planets";

// The orbit table is hand-tuned, so these guard the properties that keep
// planets from covering each other. A failure here means the layout changed in
// a way that lets two bodies overlap on screen.
describe("orbit slot layout", () => {
  it("has one slot per planet the GitHub fetch can return", () => {
    expect(ORBIT_SLOTS).toHaveLength(MAX_PLANETS);
  });

  it("leaves every pair of neighbouring orbits clear at hover scale", () => {
    for (let i = 0; i < ORBIT_SLOTS.length - 1; i++) {
      const inner = ORBIT_SLOTS[i]!;
      const outer = ORBIT_SLOTS[i + 1]!;
      const gap = outer.orbitRadius - inner.orbitRadius;
      const needed = planetFootprint(inner) + planetFootprint(outer);

      expect(gap, `slots ${i} and ${i + 1} overlap`).toBeGreaterThan(needed);
    }
  });

  it("orders orbits outward so slot order matches distance from the sun", () => {
    const radii = ORBIT_SLOTS.map((s) => s.orbitRadius);

    expect(radii).toEqual([...radii].sort((a, b) => a - b));
  });

  it("keeps the outermost planet clear of the asteroid belt", () => {
    const last = ORBIT_SLOTS.at(-1)!;

    expect(last.orbitRadius + planetFootprint(last)).toBeLessThan(BELT_INNER);
  });

  it("slows planets down noticeably as they get further out", () => {
    for (let i = 0; i < ORBIT_SLOTS.length - 1; i++) {
      const ratio = ORBIT_SLOTS[i]!.speed / ORBIT_SLOTS[i + 1]!.speed;

      expect(ratio, `slots ${i} and ${i + 1} travel at nearly the same speed`).toBeGreaterThan(
        1.12,
      );
    }
  });

  it("avoids small-integer speed ratios, so conjunctions drift rather than repeat", () => {
    // A ratio near 1:1, 5:4, 4:3, 3:2 or 2:1 would park two planets in a
    // repeating pattern and have them meet in the same place over and over.
    const resonances = [1, 5 / 4, 4 / 3, 3 / 2, 2];

    for (let i = 0; i < ORBIT_SLOTS.length; i++) {
      for (let j = i + 1; j < ORBIT_SLOTS.length; j++) {
        const ratio = ORBIT_SLOTS[i]!.speed / ORBIT_SLOTS[j]!.speed;
        for (const r of resonances) {
          expect(
            Math.abs(ratio - r),
            `slots ${i} and ${j} sit on a ${r.toFixed(2)}:1 resonance`,
          ).toBeGreaterThan(0.02);
        }
      }
    }
  });

  it("spreads starting phases around the orbit instead of bunching them", () => {
    const phases = ORBIT_SLOTS.map((s) => s.phase).sort((a, b) => a - b);

    for (const p of phases) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(Math.PI * 2);
    }
    // Golden-angle spacing keeps every pair of adjacent phases well apart.
    for (let i = 0; i < phases.length - 1; i++) {
      expect(phases[i + 1]! - phases[i]!).toBeGreaterThan(0.5);
    }
  });

  it("varies inclination in both directions for vertical separation", () => {
    const tilts = ORBIT_SLOTS.map((s) => s.tilt);

    expect(tilts.some((t) => t > 0)).toBe(true);
    expect(tilts.some((t) => t < 0)).toBe(true);
    // Flat orbits would let radial neighbours slide straight across each other.
    for (const t of tilts) expect(Math.abs(t)).toBeGreaterThan(0.05);
  });

  it("gives each slot its own colour", () => {
    expect(new Set(ORBIT_SLOTS.map((s) => s.color)).size).toBe(ORBIT_SLOTS.length);
  });
});
