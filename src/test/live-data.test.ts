import { describe, expect, it } from "vitest";

import {
  parseCodolioProfile,
  pickFeaturedRepos,
  type CodolioResponse,
  type GitHubRepo,
} from "@/components/space/liveData.parse";
import {
  buildPlanets,
  DEFAULT_OWNER,
  FEATURED,
  featuredSlug,
  MAX_PLANETS,
  ORBIT_SLOTS,
} from "@/components/space/planets";

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

function repo(
  over: Partial<GitHubRepo> & { name: string; owner?: string | undefined },
): GitHubRepo {
  const owner = over.owner ?? DEFAULT_OWNER;
  return {
    full_name: `${owner}/${over.name}`,
    description: null,
    language: "JavaScript",
    topics: [],
    stargazers_count: 0,
    html_url: `https://github.com/${owner}/${over.name}`,
    homepage: null,
    pushed_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

/** Every repo in the manual list, as GitHub would return them. */
const allFeatured = () => FEATURED.map((f) => repo({ name: f.repo, owner: f.owner }));

describe("pickFeaturedRepos", () => {
  it("returns the featured repos in the order FEATURED lists them", () => {
    // Hand them over shuffled: the result must still follow FEATURED.
    const shuffled = [...allFeatured()].reverse();

    const names = pickFeaturedRepos(shuffled)!.map((r) => r.name.toLowerCase());

    expect(names).toEqual(FEATURED.map((f) => f.repo.toLowerCase()));
  });

  it("ignores repos that are not on the list, including the portfolio's own", () => {
    const repos = pickFeaturedRepos([
      repo({ name: "Kartik-Gupta" }), // this portfolio — used to rank 2nd
      repo({ name: "DROPBOX-CSS-CLONE" }),
      repo({ name: "Sound2Song" }),
    ])!;

    expect(repos.map((r) => r.name)).toEqual(["Sound2Song"]);
  });

  it("matches on owner too, so a same-named repo elsewhere is not mistaken for it", () => {
    const org = FEATURED.find((f) => f.owner);
    if (!org) return;
    // Same repo name, wrong owner — a name-only match would wrongly accept it.
    const imposter = pickFeaturedRepos([repo({ name: org.repo, owner: "someone-else" })]);

    expect(imposter).toBeNull();

    const real = pickFeaturedRepos([repo({ name: org.repo, owner: org.owner })])!;

    expect(real[0]!.slug).toBe(featuredSlug(org));
  });

  it("picks up a repo owned by a team org, not just the personal account", () => {
    const org = FEATURED.find((f) => f.owner);
    if (!org) return;

    const planets = buildPlanets(pickFeaturedRepos([repo({ name: org.repo, owner: org.owner })])!);
    const planet = planets.find((p) => p.id === org.repo.toLowerCase())!;

    expect(planet.link).toBe(`https://github.com/${org.owner}/${org.repo}`);
  });

  it("never ranks by stars or recency", () => {
    const first = FEATURED[0]!.repo;
    const second = FEATURED[1]!.repo;
    const repos = pickFeaturedRepos([
      repo({ name: first, stargazers_count: 0, pushed_at: "2019-01-01T00:00:00Z" }),
      // heavily starred and freshly pushed — must still come second
      repo({ name: second, stargazers_count: 9999, pushed_at: "2026-12-31T00:00:00Z" }),
    ])!;

    expect(repos.map((r) => r.name)).toEqual([first, second]);
  });

  it("matches repo names case-insensitively", () => {
    const repos = pickFeaturedRepos([repo({ name: FEATURED[0]!.repo.toUpperCase() })])!;

    expect(repos).toHaveLength(1);
  });

  it("returns only what GitHub actually had", () => {
    const repos = pickFeaturedRepos([repo({ name: "Musico" })])!;

    expect(repos.map((r) => r.name)).toEqual(["Musico"]);
  });

  it("returns null for an error body or when none of the featured repos are present", () => {
    expect(pickFeaturedRepos({ message: "Not Found" })).toBeNull();
    expect(pickFeaturedRepos([])).toBeNull();
    expect(pickFeaturedRepos([repo({ name: "something-else" })])).toBeNull();
  });
});

describe("the featured list", () => {
  it("fits the available orbit slots", () => {
    expect(FEATURED.length).toBeLessThanOrEqual(MAX_PLANETS);
  });

  it("has no duplicate repos", () => {
    const names = FEATURED.map((f) => f.repo.toLowerCase());

    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every ready project its own write-up", () => {
    for (const f of FEATURED) {
      if (f.pending) continue;
      expect(f.tagline, `${f.repo} has no tagline`).toBeTruthy();
      expect(f.description, `${f.repo} has no description`).toBeTruthy();
      expect(f.tech?.length, `${f.repo} has no tech list`).toBeTruthy();
    }
  });

  it("leaves pending projects without copy, so none is invented for them", () => {
    for (const f of FEATURED) {
      if (!f.pending) continue;
      expect(f.description).toBeUndefined();
    }
  });
});

describe("buildPlanets", () => {
  it("renders every ready project with no live data at all", () => {
    const planets = buildPlanets();
    const ready = FEATURED.filter((f) => !f.pending);

    expect(planets).toHaveLength(ready.length);
    expect(planets.map((p) => p.name)).toEqual(ready.map((f) => f.name));
  });

  it("holds a pending project back until GitHub returns its repo", () => {
    const list = [
      { repo: "Ready", tagline: "t", description: "d", tech: ["x"] },
      { repo: "NotPushedYet", pending: true },
    ];

    // With no live data the pending one is withheld rather than rendered with
    // placeholder copy and a link that would 404.
    expect(buildPlanets([], list).map((p) => p.id)).toEqual(["ready"]);

    const live = pickFeaturedRepos([repo({ name: "NotPushedYet" })], list)!;

    expect(buildPlanets(live, list).map((p) => p.id)).toEqual(["ready", "notpushedyet"]);
  });

  it("gives a pending project no invented copy once it does appear", () => {
    const list = [{ repo: "NotPushedYet", pending: true }];
    const live = pickFeaturedRepos(
      [repo({ name: "NotPushedYet", description: "what github says", language: "Go" })],
      list,
    )!;
    const planet = buildPlanets(live, list)[0]!;

    // Falls through to GitHub's own words, not something made up for it.
    expect(planet.description).toBe("what github says");
    expect(planet.tagline).toBe("Go");
  });

  it("fills orbits from the innermost outward, leaving no empty slot", () => {
    for (const repos of [[], allFeatured(), allFeatured().slice(0, 3)]) {
      const planets = buildPlanets(pickFeaturedRepos(repos) ?? []);
      const expected = ORBIT_SLOTS.slice(0, planets.length).map((s) => s.orbitRadius);

      expect(planets.map((p) => p.orbitRadius)).toEqual(expected);
    }
  });

  it("keeps the line-up in FEATURED's order regardless of what GitHub returns", () => {
    const order = (repos: GitHubRepo[]) =>
      buildPlanets(pickFeaturedRepos(repos) ?? []).map((p) => p.id);
    const featuredOrder = FEATURED.map((f) => f.repo.toLowerCase());
    const rank = (ids: string[]) => ids.map((id) => featuredOrder.indexOf(id));

    for (const repos of [allFeatured(), [...allFeatured()].reverse(), []]) {
      const ranks = rank(order(repos));
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it("gives every planet a distinct orbit and colour", () => {
    const planets = buildPlanets(pickFeaturedRepos(allFeatured())!);

    expect(new Set(planets.map((p) => p.orbitRadius)).size).toBe(planets.length);
    expect(new Set(planets.map((p) => p.color)).size).toBe(planets.length);
  });

  it("prefers the curated write-up over GitHub's own description", () => {
    const planets = buildPlanets(
      pickFeaturedRepos([repo({ name: "Musico", description: "whatever github says" })])!,
    );
    const musico = planets.find((p) => p.id === "musico")!;

    expect(musico.description).toBe(FEATURED.find((f) => f.repo === "Musico")!.description);
  });

  it("carries live stars, push date and repo link through", () => {
    const planets = buildPlanets(
      pickFeaturedRepos([
        repo({ name: "Chattify", stargazers_count: 7, pushed_at: "2026-10-26T00:00:00Z" }),
      ])!,
    );
    const chattify = planets.find((p) => p.id === "chattify")!;

    expect(chattify.stars).toBe(7);
    expect(chattify.updatedAt).toBe("2026-10-26T00:00:00Z");
    expect(chattify.link).toBe("https://github.com/Kartik5463/Chattify");
  });

  it("omits the code link for a project GitHub has not confirmed", () => {
    const musico = buildPlanets().find((p) => p.id === "musico")!;

    expect(musico.link).toBeUndefined();
    expect(musico.stars).toBe(0);
  });

  it("ignores a blank homepage instead of offering an empty demo link", () => {
    const planets = buildPlanets(
      pickFeaturedRepos([repo({ name: "Bookify_Project", homepage: "" })])!,
    );

    expect(planets.find((p) => p.id === "bookify_project")!.demo).toBeUndefined();
  });

  it("passes a real deploy URL through as the demo link", () => {
    const planets = buildPlanets(
      pickFeaturedRepos([repo({ name: "ArtMart", homepage: "https://artmart-seven.vercel.app" })])!,
    );

    expect(planets.find((p) => p.id === "artmart")!.demo).toBe("https://artmart-seven.vercel.app");
  });
});
