// Fetches the featured repos from GitHub server-side (avoids CORS and keeps the
// unauthenticated rate limit under control via an in-process cache).
//
// Which projects these are is fixed by the FEATURED list in planets.ts — this
// only fetches their current details. See liveData.parse.ts for the mapping.
import { createServerFn } from "@tanstack/react-start";
import { pickFeaturedRepos } from "./liveData.parse";
import { DEFAULT_OWNER, FEATURED, type LiveRepo } from "./planets";

const CACHE_TTL = 30 * 60 * 1000; // GitHub allows 60 unauthenticated calls/hour per IP.

let cache: { at: number; repos: LiveRepo[] } | null = null;
let inFlight: Promise<LiveRepo[] | null> | null = null;

const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "kartik-space-portfolio",
};

async function getJson(url: string): Promise<unknown | null> {
  const res = await fetch(url, { headers: GH_HEADERS, signal: AbortSignal.timeout(8000) });
  return res.ok ? await res.json() : null;
}

/**
 * One listing covers everything under the personal account. Repos owned by
 * someone else — a team org, say — aren't in that listing, so each is fetched
 * on its own. That is two requests in total today, which matters: unauthenticated
 * GitHub allows 60 per hour per IP, and a serverless IP is shared.
 */
async function load(): Promise<LiveRepo[] | null> {
  const externalOwners = [
    ...new Set(
      FEATURED.filter((f) => f.owner && f.owner !== DEFAULT_OWNER).map(
        (f) => `${f.owner}/${f.repo}`,
      ),
    ),
  ];

  const [own, ...external] = await Promise.all([
    getJson(`https://api.github.com/users/${DEFAULT_OWNER}/repos?per_page=100&sort=pushed`),
    ...externalOwners.map((slug) => getJson(`https://api.github.com/repos/${slug}`)),
  ]);

  const all = [...(Array.isArray(own) ? own : []), ...external.filter(Boolean)];
  return all.length ? pickFeaturedRepos(all) : null;
}

export const getFeaturedRepos = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveRepo[] | null> => {
    if (cache && Date.now() - cache.at < CACHE_TTL) return cache.repos;
    // Collapse concurrent misses into a single upstream request.
    inFlight ??= load()
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
    const repos = await inFlight;
    if (repos) cache = { at: Date.now(), repos };
    // Serve a stale cache rather than nothing when GitHub is unreachable.
    return repos ?? cache?.repos ?? null;
  },
);
