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
  link?: string;
  /** Deploy URL from the repo's GitHub homepage field, when it has one. */
  demo?: string | undefined;
  stars?: number;
  updatedAt?: string;
}

const GH = "https://github.com/Kartik5463";

/** A repo as the GitHub fetch hands it over — see github.functions.ts. */
export interface LiveRepo {
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

interface Curated {
  name?: string;
  tagline: string;
  description: string;
  tech?: string[];
}

const CURATED: Record<string, Curated> = {
  chattify: {
    tagline: "Real-time Chat App",
    description:
      "A real-time messaging app with live rooms and instant delivery — built to explore WebSocket-driven architecture and clean client state sync.",
    tech: ["JavaScript", "React", "WebSockets"],
  },
  artmart: {
    name: "ArtMart",
    tagline: "Art Marketplace",
    description:
      "An online marketplace for art — browse, list and discover artwork through a polished storefront UI with a component-driven design.",
    tech: ["JavaScript", "React", "CSS"],
  },
  musico: {
    tagline: "Music Streaming UI",
    description:
      "A music streaming interface with playlists, player controls and a sleek listening experience — focused on smooth interactions and media UI.",
    tech: ["JavaScript", "React", "Audio API"],
  },
  bookify_project: {
    name: "Bookify",
    tagline: "Book Discovery App",
    description:
      "A book-lover's app built with React Router DOM for seamless navigation and Zustand for lightweight, predictable state management.",
    tech: ["React", "React Router", "Zustand"],
  },
  "media-search-react-redux-project-": {
    name: "Media Search",
    tagline: "Image & Video Finder",
    description:
      "A React + Redux app that fetches images and videos for anything you search — with the ability to save your favourites into a personal collection.",
    tech: ["React", "Redux", "REST APIs"],
  },
  "subreddit-vibe-check": {
    name: "Subreddit Vibe Check",
    tagline: "Sentiment Analyzer",
    description:
      "A tool that reads the mood of any subreddit — pulling posts and analyzing the vibe of the community conversation.",
    tech: ["JavaScript", "Reddit API", "Sentiment Analysis"],
  },
  "dropbox-css-clone": {
    name: "Dropbox Clone",
    tagline: "Pixel-perfect Landing Page",
    description:
      "A faithful rebuild of the Dropbox marketing page in pure HTML and CSS — an exercise in layout precision, spacing and responsive behaviour.",
    tech: ["HTML", "CSS", "Responsive Design"],
  },
};

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

function techFor(repo: LiveRepo, curated?: Curated): string[] {
  if (curated?.tech?.length) return curated.tech;
  const tags = [repo.language, ...repo.topics.map(prettifyName)].filter((t): t is string =>
    Boolean(t),
  );
  return tags.length ? Array.from(new Set(tags)).slice(0, 4) : ["Code"];
}

/** Places live repos into the fixed orbit slots. Repos past the slot count are
 *  dropped; fewer repos just leave the outer orbits empty. */
export function buildPlanets(repos: LiveRepo[]): ProjectPlanet[] {
  return repos.slice(0, MAX_PLANETS).map((repo, i) => {
    const slot = ORBIT_SLOTS[i]!;
    const curated = CURATED[repo.name.toLowerCase()];
    return {
      ...slot,
      id: repo.name.toLowerCase(),
      name: curated?.name ?? prettifyName(repo.name),
      tagline: curated?.tagline ?? repo.language ?? "Repository",
      description:
        curated?.description ??
        repo.description ??
        `A ${repo.language ?? "code"} project — open the repo to dig into how it is built.`,
      tech: techFor(repo, curated),
      link: repo.url,
      demo: repo.homepage?.startsWith("http") ? repo.homepage : undefined,
      stars: repo.stars,
      updatedAt: repo.pushedAt,
    };
  });
}

/** Shown instantly on first paint and whenever GitHub can't be reached. Kept in
 *  the same order the live ranking produces, so the swap-in doesn't visibly
 *  reshuffle which project sits in which orbit. */
export const FALLBACK_REPOS: LiveRepo[] = [
  {
    name: "Subreddit-vibe-check",
    description: null,
    language: "JavaScript",
    topics: [],
    stars: 0,
    url: `${GH}/Subreddit-vibe-check`,
    homepage: null,
    pushedAt: "2026-10-26T00:00:00Z",
  },
  {
    name: "Chattify",
    description: null,
    language: "JavaScript",
    topics: [],
    stars: 0,
    url: `${GH}/Chattify`,
    homepage: "https://chattify-navy.vercel.app",
    pushedAt: "2026-09-22T00:00:00Z",
  },
  {
    name: "ArtMart",
    description: null,
    language: "JavaScript",
    topics: [],
    stars: 0,
    url: `${GH}/ArtMart`,
    homepage: "https://artmart-seven.vercel.app",
    pushedAt: "2026-08-06T00:00:00Z",
  },
  {
    name: "Musico",
    description: null,
    language: "JavaScript",
    topics: [],
    stars: 0,
    url: `${GH}/Musico`,
    homepage: null,
    pushedAt: "2026-07-19T00:00:00Z",
  },
  {
    name: "Bookify_Project",
    description: null,
    language: "JavaScript",
    topics: [],
    stars: 0,
    url: `${GH}/Bookify_Project`,
    homepage: null,
    pushedAt: "2026-07-18T00:00:00Z",
  },
  {
    name: "DROPBOX-CSS-CLONE",
    description: null,
    language: "HTML",
    topics: [],
    stars: 0,
    url: `${GH}/DROPBOX-CSS-CLONE`,
    homepage: null,
    pushedAt: "2026-07-17T00:00:00Z",
  },
  {
    name: "Media-search-React-Redux-Project-",
    description: null,
    language: "JavaScript",
    topics: [],
    stars: 0,
    url: `${GH}/Media-search-React-Redux-Project-`,
    homepage: null,
    pushedAt: "2026-04-18T00:00:00Z",
  },
];

export const PROJECT_PLANETS: ProjectPlanet[] = buildPlanets(FALLBACK_REPOS);

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
