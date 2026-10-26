import { useEffect } from "react";
import { X, Code2, ArrowUpRight, Star, ExternalLink } from "lucide-react";
import { spaceStore, useSpace } from "./store";

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "pushed 3 days ago" — straight from the repo's last push. */
function lastPush(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const days = Math.round((then - Date.now()) / 86_400_000);
  if (Math.abs(days) < 1) return "updated today";
  if (Math.abs(days) < 30) return `updated ${RELATIVE.format(days, "day")}`;
  if (Math.abs(days) < 365) return `updated ${RELATIVE.format(Math.round(days / 30), "month")}`;
  return `updated ${RELATIVE.format(Math.round(days / 365), "year")}`;
}

export function ProjectPanel() {
  const selected = useSpace((s) => s.selected);
  const planets = useSpace((s) => s.planets);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") spaceStore.set({ selected: null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const p = planets.find((x) => x.id === selected);
  if (!p) return null;
  const idx = planets.indexOf(p);
  const go = (dir: number) => {
    const n = planets[(idx + dir + planets.length) % planets.length];
    if (n) spaceStore.set({ selected: n.id });
  };
  const pushed = lastPush(p.updatedAt);

  return (
    <aside
      key={p.id}
      className="glass-panel fixed bottom-4 left-4 right-4 z-40 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 md:bottom-auto md:left-auto md:right-8 md:top-1/2 md:w-[400px] md:-translate-y-1/2"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Planet {String(idx + 1).padStart(2, "0")} / {p.tagline}
          </p>
          <h3 className="mt-2 text-3xl font-bold" style={{ color: p.glow }}>
            {p.name}
          </h3>
        </div>
        <button
          aria-label="Close project"
          onClick={() => spaceStore.set({ selected: null })}
          className="rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-4 leading-relaxed text-muted-foreground">{p.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {p.tech.map((t) => (
          <span
            key={t}
            className="rounded-full border px-3 py-1 font-mono text-xs text-foreground/80"
          >
            {t}
          </span>
        ))}
      </div>
      {(pushed || p.stars) && (
        <p className="mt-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {!!p.stars && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3" /> {p.stars}
            </span>
          )}
          {pushed}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {p.link && (
            <a
              href={p.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Code2 className="h-4 w-4" /> View code <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
          {p.demo && (
            <a
              href={p.demo}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" /> Live demo
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => go(-1)}
            className="rounded-full border px-4 py-2 text-sm hover:bg-accent"
          >
            Prev
          </button>
          <button
            onClick={() => go(1)}
            className="rounded-full border px-4 py-2 text-sm hover:bg-accent"
          >
            Next
          </button>
        </div>
      </div>
    </aside>
  );
}
