import { useEffect, useMemo, useRef } from "react";
import type { ActivityCalendar } from "../space/liveData.parse";
import { heatLevel, weekColumns } from "./geometry";

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

/**
 * A year of problem-solving, one cell per day, from the live Codolio data —
 * the same picture as a GitHub contribution graph. Scrolls sideways on narrow
 * screens, opening on the most recent weeks.
 */
export function ActivityHeatmap({ calendar }: { calendar: ActivityCalendar | null }) {
  const scroller = useRef<HTMLDivElement>(null);
  const weeks = useMemo(() => (calendar ? weekColumns(calendar) : []), [calendar]);
  const max = useMemo(() => Math.max(1, ...(calendar?.counts ?? [0])), [calendar]);
  const total = calendar?.counts.reduce((a, b) => a + b, 0) ?? 0;
  const active = calendar?.counts.filter((c) => c > 0).length ?? 0;

  // Open on the latest weeks rather than a year ago.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks.length]);

  if (!calendar) {
    return (
      <div className="heatmap heatmap--waiting" aria-live="polite">
        <span className="hud__blip" /> Receiving telemetry from Codolio…
      </div>
    );
  }

  return (
    <div className="heatmap">
      <div ref={scroller} className="heatmap__scroller">
        <div
          className="heatmap__grid"
          role="img"
          aria-label={`${total.toLocaleString()} submissions over ${active} active days in the last year`}
        >
          <div className="heatmap__months" aria-hidden="true">
            {weeks.map((w, i) => (
              <span key={i}>{w.monthStart ? MONTH.format(new Date(w.monthStart)) : ""}</span>
            ))}
          </div>
          <div className="heatmap__cells" aria-hidden="true">
            {weeks.map((w, col) =>
              w.days.map((d) => (
                <i
                  key={d.date}
                  className={`hm-l${heatLevel(d.count, max)}`}
                  style={{ gridColumn: col + 1, gridRow: d.weekday + 1 }}
                  title={`${d.count} submission${d.count === 1 ? "" : "s"} · ${DAY.format(new Date(d.date))}`}
                />
              )),
            )}
          </div>
        </div>
      </div>
      <div className="heatmap__legend" aria-hidden="true">
        Less
        {[0, 1, 2, 3, 4].map((l) => (
          <i key={l} className={`hm-l${l}`} />
        ))}
        More
      </div>
    </div>
  );
}
