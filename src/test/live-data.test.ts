import { describe, expect, it } from "vitest";

import {
  parseCodolioProfile,
  pickTopRepos,
  type CodolioResponse,
  type GitHubRepo,
} from "@/components/space/liveData.parse";
import { buildPlanets, MAX_PLANETS } from "@/components/space/planets";

const DAY = 86_400;

/** Shaped like a real api.codolio.com/profile response, trimmed to the fields we read. */
function codolioFixture(): CodolioResponse {
  return {
    data: {
      profileViews: 44,
      platformProfiles: {
        platformProfiles: [
          {
            platform: "leetcode",
            userStats: { currentRating: 1562, maxRating: 1562 },
            badgeStats: { badgeList: [{}, {}, {}, {}, {}, {}] },
            topicAnalysisStats: {
              topicWiseDistribution: { Arrays: 296, String: 141, Math: 119, DFS: 72 },
            },
            totalQuestionStats: {
              totalQuestionCounts: 608,
              easyQuestionCounts: 258,
              mediumQuestionCounts: 307,
              hardQuestionCounts: 43,
            },
            contestActivityStats: { contestActivityList: Array.from({ length: 11 }, () => ({})) },
            // three consecutive days, then a gap, then two
            dailyActivityStatsResponse: {
              submissionCalendar: {
                [DAY * 100]: 5,
                [DAY * 101]: 3,
                [DAY * 102]: 1,
                [DAY * 110]: 2,
                [DAY * 111]: 4,
              },
            },
          },
          {
            platform: "geeksforgeeks",
            userStats: { currentRating: null },
            badgeStats: null,
            topicAnalysisStats: { topicWiseDistribution: { CPP: 1, "AVL-Tree": 1 } },
            totalQuestionStats: {
              totalQuestionCounts: 200,
              easyQuestionCounts: 40,
              mediumQuestionCounts: 120,
              hardQuestionCounts: 20,
              basicQuestionCounts: 20,
              schoolQuestionCounts: 0,
            },
            contestActivityStats: null,
            // one day overlaps leetcode, one extends the first streak to four
            dailyActivityStatsResponse: {
              submissionCalendar: { [DAY * 102]: 6, [DAY * 103]: 1 },
            },
          },
        ],
      },
    },
  };
}

describe("parseCodolioProfile", () => {
  it("sums solved counts across platforms and folds GFG's basic tier into easy", () => {
    const s = parseCodolioProfile(codolioFixture())!;

    expect(s.questionsSolved).toBe(808);
    expect(s.easy).toBe(318); // 258 + 40 + 20 basic
    expect(s.medium).toBe(427);
    expect(s.hard).toBe(63);
    // the difficulty breakdown must add up to the headline number
    expect(s.easy + s.medium + s.hard).toBe(s.questionsSolved);
  });

  it("reads the rating, contest and badge counts", () => {
    const s = parseCodolioProfile(codolioFixture())!;

    expect(s.leetcodeRating).toBe(1562);
    expect(s.contests).toBe(11);
    expect(s.badges).toBe(6);
    expect(s.profileViews).toBe(44);
  });

  it("merges submission calendars before counting active days and the streak", () => {
    const s = parseCodolioProfile(codolioFixture())!;

    // 100,101,102,103,110,111 — six unique days across both platforms
    expect(s.activeDays).toBe(6);
    // the GFG day at 103 extends leetcode's 100-102 run to four
    expect(s.maxStreak).toBe(4);
    // overlapping days are added together, not counted once
    expect(s.submissions).toBe(22);
  });

  it("ranks topics from LeetCode only and caps the list at six", () => {
    const s = parseCodolioProfile(codolioFixture())!;

    expect(s.topics.map((t) => t.name)).toEqual(["Arrays", "String", "Math", "DFS"]);
    expect(s.topics.length).toBeLessThanOrEqual(6);
  });

  it("returns null when the payload carries no platforms", () => {
    expect(parseCodolioProfile({})).toBeNull();
    expect(
      parseCodolioProfile({ data: { platformProfiles: { platformProfiles: [] } } }),
    ).toBeNull();
  });
});

function repo(over: Partial<GitHubRepo> & { name: string }): GitHubRepo {
  return {
    description: null,
    language: "JavaScript",
    topics: [],
    stargazers_count: 0,
    forks_count: 0,
    html_url: `https://github.com/Kartik5463/${over.name}`,
    homepage: null,
    pushed_at: "2026-01-01T00:00:00Z",
    fork: false,
    archived: false,
    private: false,
    ...over,
  };
}

describe("pickTopRepos", () => {
  it("drops forks, archived and private repos", () => {
    const repos = pickTopRepos([
      repo({ name: "mine" }),
      repo({ name: "forked", fork: true }),
      repo({ name: "old", archived: true }),
      repo({ name: "secret", private: true }),
    ])!;

    expect(repos.map((r) => r.name)).toEqual(["mine"]);
  });

  it("ranks by stars first, then by most recent push", () => {
    const repos = pickTopRepos([
      repo({ name: "stale", pushed_at: "2020-01-01T00:00:00Z" }),
      repo({ name: "fresh", pushed_at: "2026-10-01T00:00:00Z" }),
      repo({ name: "starred", stargazers_count: 3, pushed_at: "2019-01-01T00:00:00Z" }),
    ])!;

    expect(repos.map((r) => r.name)).toEqual(["starred", "fresh", "stale"]);
  });

  it(`returns at most ${MAX_PLANETS} repos`, () => {
    const many = Array.from({ length: 20 }, (_, i) => repo({ name: `r${i}` }));

    expect(pickTopRepos(many)!.length).toBe(MAX_PLANETS);
  });

  it("returns null for an error body or an empty account", () => {
    expect(pickTopRepos({ message: "Not Found" })).toBeNull();
    expect(pickTopRepos([])).toBeNull();
  });
});

describe("buildPlanets", () => {
  it("gives every planet a distinct orbit and keeps the ranking order", () => {
    const planets = buildPlanets(
      pickTopRepos([
        repo({ name: "Chattify", homepage: "https://chattify-navy.vercel.app" }),
        repo({ name: "DROPBOX-CSS-CLONE", language: "HTML", pushed_at: "2025-01-01T00:00:00Z" }),
      ])!,
    );

    expect(planets.map((p) => p.name)).toEqual(["Chattify", "Dropbox Clone"]);
    expect(new Set(planets.map((p) => p.orbitRadius)).size).toBe(2);
    expect(planets[0]!.demo).toBe("https://chattify-navy.vercel.app");
  });

  it("carries live stars and the push date through to the planet", () => {
    const planets = buildPlanets(
      pickTopRepos([
        repo({ name: "Chattify", stargazers_count: 7, pushed_at: "2026-09-22T00:00:00Z" }),
      ])!,
    );

    expect(planets[0]!.stars).toBe(7);
    expect(planets[0]!.updatedAt).toBe("2026-09-22T00:00:00Z");
    expect(planets[0]!.link).toBe("https://github.com/Kartik5463/Chattify");
  });

  it("ignores a blank homepage instead of offering an empty demo link", () => {
    const planets = buildPlanets(pickTopRepos([repo({ name: "Bookify_Project", homepage: "" })])!);

    expect(planets[0]!.demo).toBeUndefined();
  });

  it("falls back to GitHub's own description and language for an uncurated repo", () => {
    const planets = buildPlanets(
      pickTopRepos([
        repo({
          name: "brand-new-thing",
          description: "Something I just started",
          language: "Rust",
          topics: ["web-assembly"],
        }),
      ])!,
    );

    expect(planets[0]!.name).toBe("Brand New Thing");
    expect(planets[0]!.description).toBe("Something I just started");
    expect(planets[0]!.tagline).toBe("Rust");
    expect(planets[0]!.tech).toEqual(["Rust", "Web Assembly"]);
  });

  it("still describes a repo that has no description at all", () => {
    const planets = buildPlanets(pickTopRepos([repo({ name: "untitled", language: null })])!);

    expect(planets[0]!.description).toBeTruthy();
    expect(planets[0]!.tech).toEqual(["Code"]);
  });
});
