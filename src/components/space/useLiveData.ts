// Live Codolio + GitHub data, stale-while-revalidate.
//
// The bundled fallback renders first, then any cached payload is applied once
// the app has hydrated, then a background refresh swaps in fresh numbers. The
// fetch itself is parked until the browser is idle so it never competes with
// booting the 3D scene.
import { useEffect, useState } from "react";
import { getCodolioStats } from "./codolio.functions";
import { type ActivityCalendar, type CodolioLiveStats } from "./liveData.parse";
import { getFeaturedRepos } from "./github.functions";
import {
  buildPlanets,
  PROFILE,
  PROJECT_PLANETS,
  type LiveRepo,
  type ProjectPlanet,
} from "./planets";

const FRESH_FOR = 30 * 60 * 1000;

interface Cached<T> {
  at: number;
  data: T;
}

function readCache<T>(key: string): Cached<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T>;
    return typeof parsed?.at === "number" && parsed.data ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* private mode or storage full — live data just won't persist */
  }
}

/** Runs `fn` once the main thread is free, so it can't delay first paint. */
function whenIdle(fn: () => void): () => void {
  const idle = (
    window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  if (idle) {
    const handle = idle(fn, { timeout: 2500 });
    return () =>
      (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(
        handle,
      );
  }
  const handle = window.setTimeout(fn, 1200);
  return () => window.clearTimeout(handle);
}

/**
 * Renders the bundled fallback, applies any cached payload as soon as the app
 * has hydrated, then revalidates in the background when that cache is stale.
 * `select` maps the raw payload onto what the UI renders.
 *
 * The first render deliberately ignores localStorage: reading it here would
 * produce different markup than the server sent, and React responds to a
 * hydration mismatch by throwing the server HTML away and rebuilding the
 * whole tree on the client.
 */
function useLive<Raw, Value>(
  key: string,
  fetcher: () => Promise<Raw | null>,
  select: (raw: Raw) => Value,
  fallback: Value,
): Value {
  const [value, setValue] = useState<Value>(fallback);

  useEffect(() => {
    let cancelled = false;
    const cached = readCache<Raw>(key);
    if (cached) setValue(select(cached.data));
    if (cached && Date.now() - cached.at < FRESH_FOR) return;

    const cancelIdle = whenIdle(() => {
      fetcher()
        .then((raw) => {
          if (cancelled || !raw) return;
          writeCache(key, raw);
          setValue(select(raw));
        })
        .catch(() => {
          /* offline or upstream down — cached/fallback values stay on screen */
        });
    });

    return () => {
      cancelled = true;
      cancelIdle();
    };
    // `key` identifies the feed; fetcher/select are stable module-level fns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return value;
}

/* ---------- Codolio ---------- */

export interface Stats {
  questionsSolved: number;
  leetcodeRating: number;
  easy: number;
  medium: number;
  hard: number;
  contests: number;
  badges: number;
  submissions: number;
  maxStreak: number;
  activeDays: number;
  topics: { name: string; count: number }[];
  /** A year of daily submissions, once live data has arrived. */
  calendar: ActivityCalendar | null;
  live: boolean;
}

const statsFallback: Stats = {
  ...PROFILE.stats,
  topics: PROFILE.topics,
  calendar: null,
  live: false,
};

function toStats(live: CodolioLiveStats): Stats {
  // `||` on purpose: a zero from upstream means "not reported", not "none".
  return {
    questionsSolved: live.questionsSolved || statsFallback.questionsSolved,
    leetcodeRating: live.leetcodeRating || statsFallback.leetcodeRating,
    easy: live.easy || statsFallback.easy,
    medium: live.medium || statsFallback.medium,
    hard: live.hard || statsFallback.hard,
    contests: live.contests || statsFallback.contests,
    badges: live.badges || statsFallback.badges,
    submissions: live.submissions || statsFallback.submissions,
    maxStreak: live.maxStreak || statsFallback.maxStreak,
    activeDays: live.activeDays || statsFallback.activeDays,
    topics: live.topics.length ? live.topics : statsFallback.topics,
    // Absent from payloads cached before the heatmap existed.
    calendar: live.calendar?.counts?.length ? live.calendar : null,
    live: true,
  };
}

export function useCodolioStats(): Stats {
  // v3: payloads gained `calendar` for the activity heatmap.
  return useLive("codolio-live-stats-v3", getCodolioStats, toStats, statsFallback);
}

/* ---------- GitHub ---------- */

export interface LiveProjects {
  planets: ProjectPlanet[];
  live: boolean;
}

const projectsFallback: LiveProjects = { planets: PROJECT_PLANETS, live: false };

function toProjects(repos: LiveRepo[]): LiveProjects {
  const planets = buildPlanets(repos);
  return planets.length ? { planets, live: true } : projectsFallback;
}

export function useProjects(): LiveProjects {
  // Bump this whenever the cached shape changes, so a returning visitor
  // refetches instead of rendering from a cache that no longer matches.
  // v2: ranked top-8 -> the manual FEATURED list.
  // v3: records gained `slug`, which is now how they are matched.
  return useLive("github-featured-repos-v3", getFeaturedRepos, toProjects, projectsFallback);
}
