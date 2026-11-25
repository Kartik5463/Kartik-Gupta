// Layout geometry for the section visuals. Pure, so it is unit-tested.

export interface HeatDay {
  date: string;
  count: number;
  /** 0 = Sunday, the row it sits in. */
  weekday: number;
}

export interface HeatWeek {
  days: HeatDay[];
  /** Set when a month begins this week — where its label goes. */
  monthStart: string | null;
}

/** Splits a calendar (starting on a Sunday) into week columns for the grid. */
export function weekColumns(cal: { start: string; counts: number[] }): HeatWeek[] {
  const start = Date.parse(`${cal.start}T00:00:00Z`);
  const weeks: HeatWeek[] = [];
  cal.counts.forEach((count, i) => {
    const d = new Date(start + i * 86_400_000);
    const week = (weeks[Math.floor(i / 7)] ??= { days: [], monthStart: null });
    const date = d.toISOString().slice(0, 10);
    week.days.push({ date, count, weekday: d.getUTCDay() });
    if (d.getUTCDate() === 1) week.monthStart = date;
  });
  return weeks;
}

/**
 * The shade for a day, 0 (none) to 4. Square-root scaled: submissions are
 * spiky, and a linear scale would leave nearly every active day in the
 * palest shade.
 */
export function heatLevel(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count / max) * 4)));
}
