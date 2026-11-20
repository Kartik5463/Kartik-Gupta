import { describe, expect, it } from "vitest";

import {
  initialDprState,
  MAX_FAILED_RAISES,
  nextDpr,
  RAISE_AFTER,
  type DprState,
} from "@/components/space/adaptiveDpr";

/** Feeds a sequence of one-second fps readings through the controller. */
function run(start: DprState, readings: number[]): DprState {
  return readings.reduce(nextDpr, start);
}

/** A device whose frame rate depends on resolution: fewer pixels, more fps. */
function gpuBound(fpsAt: (dpr: number) => number, seconds: number) {
  let s = initialDprState(2, 1, 2);
  const history: number[] = [];
  for (let i = 0; i < seconds; i++) {
    s = nextDpr(s, fpsAt(s.dpr));
    history.push(s.dpr);
  }
  return { s, history };
}

describe("adaptive resolution", () => {
  it("starts at the sharpest allowed resolution, clamped to the range", () => {
    expect(initialDprState(3, 1, 2).dpr).toBe(2);
    expect(initialDprState(1.5, 1, 2).dpr).toBe(1.5);
    expect(initialDprState(0.5, 1, 2).dpr).toBe(1);
  });

  it("stays sharp on a device that keeps up", () => {
    const s = run(initialDprState(2, 1, 2), Array(30).fill(60));

    expect(s.dpr).toBe(2);
  });

  it("ignores the slow first seconds while the scene is starting", () => {
    const s = run(initialDprState(2, 1, 2), [12, 20]);

    expect(s.dpr).toBe(2);
  });

  it("lowers resolution on a struggling device until it keeps up", () => {
    // 2x -> 35fps, 1.75x -> 46fps, 1.5x -> 62fps
    const { s } = gpuBound((dpr) => (dpr >= 2 ? 35 : dpr >= 1.75 ? 46 : 62), 20);

    expect(s.dpr).toBe(1.5);
    expect(s.locked).toBe(false);
  });

  it("finds a better resolution even when one small step shows no gain", () => {
    // vsync plateaus: 2x and 1.75x both run at 40fps, 1.5x and below at 60fps.
    const { s } = gpuBound((dpr) => (dpr > 1.5 ? 40 : 60), 30);

    expect(s.dpr).toBe(1.5);
    expect(s.locked).toBe(false);
  });

  it("does not blur a power-saving phone whose display is capped at 30fps", () => {
    // Frame rate is 30 whatever the resolution, so lowering it can't help.
    const { s, history } = gpuBound(() => 30, 20);

    expect(s.dpr).toBe(2);
    expect(s.locked).toBe(true);
    // One brief probe at the minimum, no gain, straight back to sharp.
    expect(history.filter((d) => d < 2).length).toBeLessThanOrEqual(2);
  });

  it("does not blur a CPU-bound phone either", () => {
    // Slow, but resolution makes no real difference.
    const { s } = gpuBound((dpr) => (dpr >= 2 ? 40 : 41), 20);

    expect(s.dpr).toBe(2);
  });

  it("never drops below the minimum", () => {
    const { s } = gpuBound(() => 20, 60);

    expect(s.dpr).toBeGreaterThanOrEqual(1);
  });

  it("climbs back to sharp once a temporary slowdown passes", () => {
    // Slow while something heavy runs, then full speed again.
    let s = initialDprState(2, 1, 2);
    let heavy = true;
    for (let i = 0; i < 60; i++) {
      if (i === 12) heavy = false;
      s = nextDpr(s, heavy ? (s.dpr >= 1.75 ? 30 : 45) : 60);
    }

    expect(s.dpr).toBe(2);
  });

  it(`waits ${RAISE_AFTER} full-speed seconds before raising resolution`, () => {
    let s: DprState = { ...initialDprState(1.5, 1, 2), warmup: 0 };
    for (let i = 0; i < RAISE_AFTER - 1; i++) s = nextDpr(s, 60);

    expect(s.dpr).toBe(1.5);
    expect(nextDpr(s, 60).dpr).toBe(1.75);
  });

  it("undoes a step up that makes the device struggle, and gives up after repeats", () => {
    // Sharp at 1.5x, too slow at 1.75x.
    const { s } = gpuBound((dpr) => (dpr > 1.5 ? 40 : 60), 200);

    expect(s.dpr).toBe(1.5);
    expect(s.failedRaises).toBe(MAX_FAILED_RAISES);
  });
});
