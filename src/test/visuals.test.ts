import { describe, expect, it } from "vitest";

import { heatLevel, weekColumns } from "@/components/sections/geometry";
import { calendarFrom } from "@/components/space/liveData.parse";

const DAY = 86_400;

describe("calendarFrom", () => {
  // 2026-11-21 is a Saturday.
  const now = Date.UTC(2026, 10, 21, 15, 30);

  it("starts on a Sunday and ends today, covering 53 week columns", () => {
    const cal = calendarFrom(new Map(), now);
    expect(new Date(`${cal.start}T00:00:00Z`).getUTCDay()).toBe(0);
    expect(cal.counts).toHaveLength(52 * 7 + 6 + 1); // 52 weeks + Sun..Sat
    expect(weekColumns(cal)).toHaveLength(53);
  });

  it("places counts on their day", () => {
    const today = Math.floor(now / 1000 / DAY) * DAY;
    const cal = calendarFrom(
      new Map([
        [today, 7],
        [today - DAY, 2],
      ]),
      now,
    );
    expect(cal.counts.at(-1)).toBe(7);
    expect(cal.counts.at(-2)).toBe(2);
  });

  it("folds a timestamp that isn't midnight into its day", () => {
    const today = Math.floor(now / 1000 / DAY) * DAY;
    const cal = calendarFrom(new Map([[today + 3600 * 5, 4]]), now);
    expect(cal.counts.at(-1)).toBe(4);
  });

  it("ignores activity older than the window", () => {
    const cal = calendarFrom(new Map([[0, 99]]), now);
    expect(cal.counts.reduce((a, b) => a + b, 0)).toBe(0);
  });
});

describe("weekColumns", () => {
  it("puts each day in its weekday row and marks month starts", () => {
    const weeks = weekColumns({ start: "2026-02-22", counts: Array(14).fill(1) }); // a Sunday
    expect(weeks).toHaveLength(2);
    expect(weeks[0]!.days.map((d) => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    // 1 March 2026 falls on the Sunday that opens week two.
    expect(weeks[1]!.monthStart).toBe("2026-03-01");
    expect(weeks[0]!.monthStart).toBeNull();
  });
});

describe("heatLevel", () => {
  it("is 0 for no activity and climbs to 4 at the busiest day", () => {
    expect(heatLevel(0, 20)).toBe(0);
    expect(heatLevel(20, 20)).toBe(4);
  });

  it("lifts light days off the bottom shade (square-root scale)", () => {
    // Linear, 2 of 20 would be the faintest shade; on the √ scale it isn't.
    expect(heatLevel(2, 20)).toBeGreaterThan(1);
  });

  it("stays within 1..4 for any active day", () => {
    for (let c = 1; c <= 50; c++) {
      const l = heatLevel(c, 50);
      expect(l).toBeGreaterThanOrEqual(1);
      expect(l).toBeLessThanOrEqual(4);
    }
  });
});
