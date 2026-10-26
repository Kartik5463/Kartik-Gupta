// Pure mapping from the Codolio and GitHub API payloads onto what the portfolio
// renders. Kept free of framework imports so it can be unit-tested directly;
// the server functions in *.functions.ts only add fetching and caching.
import { MAX_PLANETS, type LiveRepo } from "./planets";

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
  fetchedAt: number;
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
  return { activeDays: days.length, maxStreak, submissions };
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

  const { activeDays, maxStreak, submissions } = activityFrom(platforms);

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
    fetchedAt: now,
  };
}

/* ---------- GitHub ---------- */

export interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  topics?: string[] | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  homepage: string | null;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
}

/** Most-starred first, then most recently pushed — so the work worth pinning floats up. */
function score(r: GitHubRepo): number {
  const recencyInDays = new Date(r.pushed_at).getTime() / 86_400_000;
  return r.stargazers_count * 1000 + r.forks_count * 300 + recencyInDays;
}

export function pickTopRepos(json: unknown): LiveRepo[] | null {
  if (!Array.isArray(json)) return null;
  const repos = (json as GitHubRepo[])
    .filter((r) => r && !r.fork && !r.archived && !r.private)
    .sort((a, b) => score(b) - score(a))
    .slice(0, MAX_PLANETS)
    .map<LiveRepo>((r) => ({
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
