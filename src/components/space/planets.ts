// Project data for the solar system.
//
// The planet list is driven live by the GitHub API (github.functions.ts). This
// file owns the *visuals* — a fixed set of orbit slots, so the solar-system
// layout stays stable no matter which repos come back — plus hand-written
// taglines/descriptions for the repos that have none on GitHub.
//
// Pure data + types, no three.js imports: safe to import from SSR routes.

export interface ProjectPlanet {
  id: string;
  name: string;
  tagline: string;
  description: string;
  tech: string[];
  color: string;
  glow: string;
  radius: number;
  orbitRadius: number;
  speed: number;
  phase: number;
  tilt: number;
  ring?: boolean;
  /** Repo URL, present only once GitHub has confirmed the repository exists. */
  link?: string | undefined;
  /** Deploy URL from the repo's GitHub homepage field, when it has one. */
  demo?: string | undefined;
  stars?: number;
  updatedAt?: string | undefined;
}

const GH = "https://github.com/Kartik5463";

/** A repo as the GitHub fetch hands it over — see github.functions.ts. */
export interface LiveRepo {
  /** "owner/repo", lowercased — the key a featured entry is matched on. */
  slug: string;
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  url: string;
  homepage: string | null;
  pushedAt: string;
}

/* ---------- orbit slots: the eight fixed "seats" planets get placed into ---------- */

type OrbitSlot = Pick<
  ProjectPlanet,
  "color" | "glow" | "radius" | "orbitRadius" | "speed" | "phase" | "tilt" | "ring"
>;

/** How much a planet swells on hover. The orbit gaps below are sized against
 *  this, so raising it can reintroduce overlap between neighbours. */
export const HOVER_SCALE = 1.15;

/** A ringed planet's ring reaches past its body, so it needs more clearance. */
export const RING_INNER_FACTOR = 1.25;
export const RING_OUTER_FACTOR = 1.6;

/** Inner edge of the asteroid belt — clear of the outermost orbit. */
export const BELT_INNER = 16.4;

/** The widest radius a planet occupies, rings and hover growth included. */
export function planetFootprint(p: Pick<ProjectPlanet, "radius" | "ring">): number {
  return p.radius * (p.ring ? RING_OUTER_FACTOR : 1) * HOVER_SCALE;
}

// All eight sit inside the asteroid belt so the whole system stays in frame.
// Three things keep planets from covering each other:
//   - gaps widen outward (1.4 -> 1.8) and every gap exceeds the two neighbouring
//     bodies' combined radii at hover scale, rings included;
//   - inclinations alternate sign and are large enough that radial neighbours
//     are also separated vertically;
//   - speeds follow a roughly Keplerian falloff with no small-integer ratios
//     between them, so conjunctions drift instead of recurring on a short cycle.
// Phases are spaced by the golden angle for the widest possible initial spread.
export const ORBIT_SLOTS: OrbitSlot[] = [
  {
    color: "#fb923c",
    glow: "#fdba74",
    radius: 0.4,
    orbitRadius: 3.4,
    speed: 0.3624,
    phase: 0.0,
    tilt: 0.1,
  },
  {
    color: "#c084fc",
    glow: "#d8b4fe",
    radius: 0.46,
    orbitRadius: 4.8,
    speed: 0.2309,
    phase: 2.4,
    tilt: -0.18,
  },
  {
    color: "#2dd4bf",
    glow: "#5eead4",
    radius: 0.52,
    orbitRadius: 6.3,
    speed: 0.1983,
    phase: 4.8,
    tilt: 0.26,
  },
  {
    color: "#60a5fa",
    glow: "#93c5fd",
    radius: 0.45,
    orbitRadius: 7.9,
    speed: 0.1423,
    phase: 0.917,
    tilt: -0.12,
  },
  {
    color: "#4ade80",
    glow: "#86efac",
    radius: 0.47,
    orbitRadius: 9.6,
    speed: 0.1204,
    phase: 3.317,
    tilt: 0.21,
    ring: true,
  },
  {
    color: "#f87171",
    glow: "#fca5a5",
    radius: 0.54,
    orbitRadius: 11.3,
    speed: 0.1031,
    phase: 5.717,
    tilt: -0.28,
  },
  {
    color: "#fbbf24",
    glow: "#fcd34d",
    radius: 0.5,
    orbitRadius: 13.0,
    speed: 0.0871,
    phase: 1.833,
    tilt: 0.15,
    ring: true,
  },
  {
    color: "#f472b6",
    glow: "#f9a8d4",
    radius: 0.58,
    orbitRadius: 14.8,
    speed: 0.073,
    phase: 4.233,
    tilt: -0.23,
  },
];

export const MAX_PLANETS = ORBIT_SLOTS.length;

/* ---------- curated copy, keyed by lowercased repo name ---------- */

/* ---------- the featured projects ----------

   ►► THIS LIST IS MANUAL. ◄◄

   It is the single source of truth for which projects appear in the solar
   system and in what order — nothing ranks, reorders, adds or drops entries
   automatically. Editing this array is the only way the line-up changes.

   `repo` names a repository on github.com/Kartik5463. Its live details —
   description, language, stars, last push and deploy URL — are fetched and
   merged in at runtime, so the content stays current while the line-up stays
   fixed. The curated copy below wins over GitHub's own description, because
   most of these repos have none.

   An entry with `pending: true` has no write-up yet and is held back until
   GitHub returns the repo, so a planet never renders with placeholder text or
   a link to a repository that isn't there. It appears on its own, in its slot
   below, as soon as the repo is public. */

/** Repos live under this account unless an entry names a different `owner`. */
export const DEFAULT_OWNER = "Kartik5463";

export interface Featured {
  /** Repository name on GitHub, exactly as it is spelled there. */
  repo: string;
  /** Owner, when the repo isn't under the personal account — a team org, say.
   *  These are fetched one by one, since they aren't in the account listing. */
  owner?: string;
  /** Display name. Defaults to the repo name, prettified. */
  name?: string;
  tagline?: string;
  description?: string;
  tech?: string[];
  /** Waiting on the repository to exist publicly — see the note above. */
  pending?: boolean;
}

export const FEATURED: Featured[] = [
  {
    repo: "Sound2Song",
    name: "Sound2Song",
    tagline: "YouTube Song Identifier",
    description:
      "Paste any YouTube link and it identifies the songs playing in it — returning the title, artist and the timestamps where each one appears.",
    tech: ["React", "Node.js", "Python", "FastAPI", "FFmpeg"],
  },
  {
    repo: "ArtMart",
    name: "ArtMart",
    tagline: "Art Marketplace",
    description:
      "An online marketplace for art — browse, list and discover artwork through a polished storefront UI with a component-driven design.",
    tech: ["JavaScript", "React", "CSS"],
  },
  {
    repo: "Chattify",
    name: "Chattify",
    tagline: "Real-time Chat App",
    description:
      "A real-time messaging app with live rooms and instant delivery — built to explore WebSocket-driven architecture and clean client state sync.",
    tech: ["JavaScript", "React", "WebSockets"],
  },
  {
    repo: "Subreddit-vibe-check",
    name: "Subreddit Vibe Check",
    tagline: "Sentiment Analyzer",
    description:
      "A tool that reads the mood of any subreddit — pulling posts and analyzing the vibe of the community conversation.",
    tech: ["JavaScript", "Reddit API", "Sentiment Analysis"],
  },
  {
    // Team repo from the Dogfood hackathon, so it lives under the org rather
    // than the personal account.
    repo: "Verdikt",
    owner: "Dogfood-Hackathon-Team-ByteMe",
    name: "Verdikt",
    tagline: "Hackathon Hosting Platform",
    description:
      "A platform for hosting hackathons, built with my team for the Dogfood hackathon — a full-stack app covering the run of an event end to end.",
    tech: ["JavaScript", "TypeScript", "CSS", "Docker"],
  },
  {
    repo: "Musico",
    name: "Musico",
    tagline: "Music Streaming UI",
    description:
      "A music streaming interface with playlists, player controls and a sleek listening experience — focused on smooth interactions and media UI.",
    tech: ["JavaScript", "React", "Audio API"],
  },
  {
    // PayPal AI Hackathon team repo, under the team's org.
    repo: "Veriflow",
    owner: "3Bit-Crew",
    name: "Veriflow",
    tagline: "AI-Verified Escrow on PayPal",
    description:
      "AI-verified escrow on PayPal: AI turns a job into a checklist, PayPal holds the payment, and automated checkers verify the GitHub pull request or live website before the payment is captured or voided. Built with my team for the PayPal AI Hackathon.",
    tech: ["React", "Node.js", "MongoDB", "Gemini", "Playwright", "PayPal API"],
  },
  {
    // Hack@BVP team repo, under the team's org rather than the personal account.
    repo: "VanDrishti",
    owner: "TeamVanRakshak",
    name: "VanDrishti",
    tagline: "Wildlife Monitoring AI",
    description:
      "A behaviour-aware AI system for wildlife monitoring and threat detection, built with my team for Hack@BVP 8.0 in the IoT, Robotics & Hardware track.",
    tech: ["Python", "AI", "IoT"],
  },
];

/** "owner/repo", lowercased — how a featured entry is matched to a live repo. */
export function featuredSlug(entry: Pick<Featured, "repo" | "owner">): string {
  return `${entry.owner ?? DEFAULT_OWNER}/${entry.repo}`.toLowerCase();
}

/** The repository's URL, known from the entry alone — no API call needed.
 *  Deriving it means every project has a working "View code" link on the first
 *  paint, and still has one if GitHub is unreachable or rate-limited. */
export function repoUrl(entry: Pick<Featured, "repo" | "owner">): string {
  return `https://github.com/${entry.owner ?? DEFAULT_OWNER}/${entry.repo}`;
}

/* ---------- repo -> planet ---------- */

const SMALL_WORDS = new Set(["and", "or", "the", "of", "a", "an", "to", "in", "for", "with"]);
const ACRONYMS = new Set([
  "css",
  "html",
  "api",
  "ui",
  "ux",
  "js",
  "ts",
  "ai",
  "ml",
  "cli",
  "db",
  "sql",
]);

/** "DROPBOX-CSS-CLONE" -> "Dropbox CSS Clone", "Bookify_Project" -> "Bookify Project" */
function prettifyName(raw: string): string {
  return raw
    .replace(/[-_.]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function techFor(entry: Featured, repo?: LiveRepo): string[] {
  if (entry.tech?.length) return entry.tech;
  const tags = [repo?.language, ...(repo?.topics ?? []).map(prettifyName)].filter(
    (t): t is string => Boolean(t),
  );
  return tags.length ? Array.from(new Set(tags)).slice(0, 4) : ["Code"];
}

/**
 * Walks FEATURED in order and hands each project the next orbit slot, so the
 * line-up and its ordering come entirely from that array.
 *
 * Slots fill from the innermost outward with no gaps, so a project held back
 * doesn't leave an empty orbit. The cost is that the planets beyond it shift
 * out by one once it appears — a cosmetic reshuffle; the order of the line-up
 * itself never changes.
 *
 * `repos` are the live GitHub records, matched by name. Passing nothing is what
 * the first paint renders from.
 */
export function buildPlanets(
  repos: LiveRepo[] = [],
  /** Overridable so the `pending` path stays testable once nothing is pending. */
  featured: Featured[] = FEATURED,
): ProjectPlanet[] {
  const live = new Map(repos.map((r) => [r.slug, r]));

  return (
    featured
      .map((entry) => ({ entry, repo: live.get(featuredSlug(entry)) }))
      // A pending project stays hidden until its repository shows up, rather
      // than rendering placeholder copy and a link that 404s.
      .filter(({ entry, repo }) => !entry.pending || repo)
      .slice(0, MAX_PLANETS)
      .map(({ entry, repo }, i) => ({
        ...ORBIT_SLOTS[i]!,
        id: entry.repo.toLowerCase(),
        name: entry.name ?? prettifyName(entry.repo),
        tagline: entry.tagline ?? repo?.language ?? "Repository",
        description:
          entry.description ??
          repo?.description ??
          `A ${repo?.language ?? "code"} project — open the repo to dig into how it is built.`,
        tech: techFor(entry, repo),
        // Prefer the URL GitHub returned (canonical casing), falling back to
        // the one built from the entry so the link is never missing.
        link: repo?.url ?? repoUrl(entry),
        demo: repo?.homepage?.startsWith("http") ? repo.homepage : undefined,
        stars: repo?.stars ?? 0,
        updatedAt: repo?.pushedAt,
      }))
  );
}

/** Rendered on the first paint, before GitHub answers, and whenever it can't
 *  be reached — the curated copy for every non-pending project. */
export const PROJECT_PLANETS: ProjectPlanet[] = buildPlanets();

export const PROFILE = {
  name: "Kartik Gupta",
  handle: "@Kartik9696",
  title: "Full-Stack Developer & Competitive Programmer",
  college: "Bharati Vidyapeeth College of Engineering",
  location: "India",
  links: {
    github: GH,
    leetcode: "https://leetcode.com/u/Kartik5647",
    linkedin: "https://www.linkedin.com/in/kartik-gupta-coder",
    codolio: "https://codolio.com/profile/Kartik9696",
  },
  // Last known-good snapshot; replaced by live Codolio numbers once they land.
  stats: {
    questionsSolved: 808,
    activeDays: 402,
    maxStreak: 116,
    leetcodeRating: 1562,
    contests: 11,
    badges: 6,
    submissions: 1755,
    easy: 318,
    medium: 427,
    hard: 63,
  },
  topics: [
    { name: "Arrays", count: 313 },
    { name: "String", count: 141 },
    { name: "HashMap & Set", count: 121 },
    { name: "Trees", count: 119 },
    { name: "Math", count: 119 },
    { name: "Dynamic Programming", count: 103 },
  ],
};
