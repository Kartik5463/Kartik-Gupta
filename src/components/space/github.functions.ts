// Fetches the top repos from GitHub server-side (avoids CORS and keeps the
// unauthenticated rate limit under control via an in-process cache).
// The ranking and field mapping live in liveData.parse.ts.
import { createServerFn } from "@tanstack/react-start";
import { pickTopRepos } from "./liveData.parse";
import { type LiveRepo } from "./planets";

const GITHUB_USER = "Kartik5463";
const CACHE_TTL = 30 * 60 * 1000; // GitHub allows 60 unauthenticated calls/hour per IP.

let cache: { at: number; repos: LiveRepo[] } | null = null;
let inFlight: Promise<LiveRepo[] | null> | null = null;

async function load(): Promise<LiveRepo[] | null> {
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "kartik-space-portfolio",
      },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) return null;
  return pickTopRepos(await res.json());
}

export const getTopRepos = createServerFn({ method: "GET" }).handler(
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
