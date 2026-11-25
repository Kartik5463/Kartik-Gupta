// Pure mapping from the Codolio and GitHub API payloads onto what the portfolio
// renders. Kept free of framework imports so it can be unit-tested directly;
// the server functions in *.functions.ts only add fetching and caching.
import { featuredSlug, FEATURED, type Featured, type LiveRepo } from "./planets";

const DAY_SECONDS = 86_400;

/* ---------- Codolio ---------- */

export interface CodolioLiveStats {
  questionsSolved: number;
  leetcodeRating: number;
  easy: number;
  medium: number;
  hard: number;
  contests: number;
  badges: number;
  submissions: number;
  activeDays: number;
  maxStreak: number;
  profileViews: number;
  topics: { name: string; count: number }[];
  /** Submissions per day for the last year, for the activity heatmap. */
  calendar: ActivityCalendar;
  fetchedAt: number;
}

/**
 * A year of daily submission counts. `start` is a Sunday (UTC) and `counts`
 * runs day by day from it through today, so the client can lay it out in week
 * columns without any date arithmetic of its own.
 */
export interface ActivityCalendar {
  start: string;
  counts: number[];
}

/** Lays merged per-day counts out as the last 52 full weeks plus this one. */
export function calendarFrom(perDay: Map<number, number>, now: number): ActivityCalendar {
  // Codolio keys days by their UTC midnight; normalise in case one isn't.
  const byDay = new Map<number, number>();
  for (const [ts, count] of perDay) {
    const day = Math.floor(ts / DAY_SECONDS) * DAY_SECONDS;
    byDay.set(day, (byDay.get(day) ?? 0) + count);
  }
  const today = Math.floor(now / 1000 / DAY_SECONDS) * DAY_SECONDS;
  const weekday = new Date(today * 1000).getUTCDay(); // 0 = Sunday
  const start = today - (52 * 7 + weekday) * DAY_SECONDS;
  const counts: number[] = [];
  for (let t = start; t <= today; t += DAY_SECONDS) counts.push(byDay.get(t) ?? 0);
  return { start: new Date(start * 1000).toISOString().slice(0, 10), counts };
}

export interface CodolioPlatform {
  platform: string;
  userStats?: { currentRating?: number | null; maxRating?: number | null } | null;
  badgeStats?: { badgeList?: unknown[] | null } | null;
  topicAnalysisStats?: { topicWiseDistribution?: Record<string, number> | null } | null;
  totalQuestionStats?: {
    totalQuestionCounts?: number | null;
    easyQuestionCounts?: number | null;
    mediumQuestionCounts?: number | null;
    hardQuestionCounts?: number | null;
    basicQuestionCounts?: number | null;
    schoolQuestionCounts?: number | null;
  } | null;
  contestActivityStats?: { contestActivityList?: unknown[] | null } | null;
  dailyActivityStatsResponse?: {
    submissionCalendar?: Record<string, number> | null;
  } | null;
}

export interface CodolioResponse {
  data?: {
    profileViews?: number;
    platformProfiles?: { platformProfiles?: CodolioPlatform[] };
  };
}

const n = (v?: number | null) => v ?? 0;

/** Merges every platform's submission calendar, then counts unique active days
 *  and the longest run of consecutive ones — which is what Codolio reports. */
function activityFrom(platforms: CodolioPlatform[]) {
  const perDay = new Map<number, number>();
  for (const p of platforms) {
    const calendar = p.dailyActivityStatsResponse?.submissionCalendar ?? {};
    for (const [ts, count] of Object.entries(calendar)) {
      const day = Number(ts);
      if (!Number.isFinite(day)) continue;
      perDay.set(day, (perDay.get(day) ?? 0) + count);
    }
  }
  const days = [...perDay.keys()].sort((a, b) => a - b);
  let maxStreak = days.length ? 1 : 0;
  let run = maxStreak;
  for (let i = 1; i < days.length; i++) {
    run = days[i]! - days[i - 1]! === DAY_SECONDS ? run + 1 : 1;
    if (run > maxStreak) maxStreak = run;
  }
  let submissions = 0;
  for (const count of perDay.values()) submissions += count;
  return { activeDays: days.length, maxStreak, submissions, perDay };
}

/** Top DSA topics, taken from LeetCode only — the GFG tag names are too noisy. */
function topicsFrom(leetcode: CodolioPlatform | undefined) {
  const dist = leetcode?.topicAnalysisStats?.topicWiseDistribution ?? {};
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));
}

export function parseCodolioProfile(
  json: CodolioResponse,
  now = Date.now(),
): CodolioLiveStats | null {
  const platforms = json.data?.platformProfiles?.platformProfiles ?? [];
  if (!platforms.length) return null;

  const leetcode = platforms.find((p) => p.platform === "leetcode");

  // Buckets are summed across platforms; GFG's "basic"/"school" tiers fold into
  // easy so the breakdown still adds up to the reported total.
  let easy = 0;
  let medium = 0;
  let hard = 0;
  let questionsSolved = 0;
  for (const p of platforms) {
    const q = p.totalQuestionStats;
    easy += n(q?.easyQuestionCounts) + n(q?.basicQuestionCounts) + n(q?.schoolQuestionCounts);
    medium += n(q?.mediumQuestionCounts);
    hard += n(q?.hardQuestionCounts);
    questionsSolved += n(q?.totalQuestionCounts);
  }
  if (!questionsSolved) questionsSolved = easy + medium + hard;

  let badges = 0;
  let contests = 0;
  for (const p of platforms) {
    badges += p.badgeStats?.badgeList?.length ?? 0;
    contests += p.contestActivityStats?.contestActivityList?.length ?? 0;
  }

  const { activeDays, maxStreak, submissions, perDay } = activityFrom(platforms);

  return {
    questionsSolved,
    leetcodeRating: n(leetcode?.userStats?.currentRating ?? leetcode?.userStats?.maxRating),
    easy,
    medium,
    hard,
    contests,
    badges,
    submissions,
    activeDays,
    maxStreak,
    profileViews: json.data?.profileViews ?? 0,
    topics: topicsFrom(leetcode),
    calendar: calendarFrom(perDay, now),
    fetchedAt: now,
  };
}

/* ---------- GitHub ---------- */

/** Only the fields the portfolio reads. */
export interface GitHubRepo {
  /** "owner/repo" as GitHub spells it. */
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  topics?: string[] | null;
  stargazers_count: number;
  html_url: string;
  homepage: string | null;
  pushed_at: string;
}

/**
 * Resolves the manual FEATURED list against the repositories GitHub returned,
 * matching on "owner/repo" so a team-org repo can sit alongside personal ones.
 *
 * There is deliberately no ranking here: the line-up and its order live in
 * FEATURED (planets.ts) and only change when that array is edited. This only
 * looks up each listed repo and converts it, keeping FEATURED's order. Repos
 * not on the list are ignored — including this portfolio's own repository,
 * which a "most recently pushed" ranking used to pull in.
 */
export function pickFeaturedRepos(
  json: unknown,
  /** Overridable for tests; production always resolves the real list. */
  featured: Featured[] = FEATURED,
): LiveRepo[] | null {
  if (!Array.isArray(json)) return null;

  const bySlug = new Map<string, GitHubRepo>();
  for (const r of json as GitHubRepo[]) {
    if (r?.full_name) bySlug.set(r.full_name.toLowerCase(), r);
  }

  const repos = featured
    .map((entry) => bySlug.get(featuredSlug(entry)))
    .filter((r): r is GitHubRepo => Boolean(r))
    .map<LiveRepo>((r) => ({
      slug: r.full_name.toLowerCase(),
      name: r.name,
      description: r.description,
      language: r.language,
      topics: r.topics ?? [],
      stars: r.stargazers_count,
      url: r.html_url,
      homepage: r.homepage,
      pushedAt: r.pushed_at,
    }));

  return repos.length ? repos : null;
}
