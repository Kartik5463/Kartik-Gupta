// Fetches live Codolio profile stats server-side (avoids CORS), public data only.
// The field mapping lives in liveData.parse.ts.
import { createServerFn } from "@tanstack/react-start";
import { parseCodolioProfile, type CodolioLiveStats, type CodolioResponse } from "./liveData.parse";

export type { CodolioLiveStats };

const CODOLIO_USER = "Kartik9696";
const CACHE_TTL = 30 * 60 * 1000;

let cache: { at: number; stats: CodolioLiveStats } | null = null;
let inFlight: Promise<CodolioLiveStats | null> | null = null;

async function load(): Promise<CodolioLiveStats | null> {
  const res = await fetch(`https://api.codolio.com/profile?userKey=${CODOLIO_USER}`, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return parseCodolioProfile((await res.json()) as CodolioResponse);
}

export const getCodolioStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<CodolioLiveStats | null> => {
    if (cache && Date.now() - cache.at < CACHE_TTL) return cache.stats;
    // Collapse concurrent misses into a single upstream request.
    inFlight ??= load()
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
    const stats = await inFlight;
    if (stats) cache = { at: Date.now(), stats };
    // Serve a stale cache rather than nothing when Codolio is unreachable.
    return stats ?? cache?.stats ?? null;
  },
);
