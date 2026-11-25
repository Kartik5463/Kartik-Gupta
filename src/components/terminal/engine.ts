// The terminal's command interpreter.
//
// Pure: a command line and a snapshot of the site's data go in; the lines to
// print and the effects to perform (fly to a planet, open a link…) come
// out. The UI in Terminal.tsx owns input, history and applying effects, so every
// command here is covered by unit tests without a browser.

import type { SkillGroup } from "../content/skills";

export interface TermProject {
  id: string;
  name: string;
  tagline: string;
  link?: string | undefined;
  demo?: string | undefined;
}

export interface TermStats {
  questionsSolved: number;
  leetcodeRating: number;
  activeDays: number;
  maxStreak: number;
  contests: number;
  live: boolean;
}

export interface TermContext {
  projects: TermProject[];
  stats: TermStats;
  skills: SkillGroup[];
  links: {
    github: string;
    linkedin: string;
    leetcode: string;
    codolio: string;
    resume: string;
    email: string;
  };
  now: Date;
}

export type TermTone = "out" | "ok" | "err" | "accent" | "muted" | "art";

export interface TermLine {
  text: string;
  tone?: TermTone;
  href?: string;
}

export type TermEffect =
  | { type: "clear" }
  | { type: "select"; id: string }
  | { type: "open"; url: string }
  | { type: "destroy" }
  | { type: "close" }
  | { type: "scroll"; to: string };

export interface TermResult {
  lines: TermLine[];
  effects: TermEffect[];
}

/* ---------- commands ---------- */

interface Command {
  name: string;
  aliases?: string[];
  usage?: string;
  help: string;
  /** Takes a project name, so Tab completes project names after it. */
  takesProject?: boolean;
  /** Left out of `help` — the easter eggs. */
  hidden?: boolean;
  run: (args: string[], ctx: TermContext, raw: string) => TermResult;
}

const out = (text: string, tone: TermTone = "out", href?: string): TermLine =>
  href ? { text, tone, href } : { text, tone };
const result = (lines: TermLine[], effects: TermEffect[] = []): TermResult => ({ lines, effects });
const fail = (text: string, hint?: string): TermResult =>
  result(hint ? [out(text, "err"), out(hint, "muted")] : [out(text, "err")]);

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Finds a project from loose input: "veri", "Veriflow", "subreddit vibe". */
export function findProject(query: string, projects: TermProject[]): TermProject | undefined {
  const q = normalize(query);
  if (!q) return undefined;
  const byName = (p: TermProject) => normalize(p.name);
  const byId = (p: TermProject) => normalize(p.id);
  return (
    projects.find((p) => byId(p) === q || byName(p) === q) ??
    projects.find((p) => byName(p).startsWith(q) || byId(p).startsWith(q)) ??
    projects.find((p) => byName(p).includes(q))
  );
}

function needProject(args: string[], ctx: TermContext, usage: string) {
  if (!args.length) return { error: fail(`usage: ${usage}`) };
  const project = findProject(args.join(" "), ctx.projects);
  if (!project) {
    return {
      error: fail(`no planet named "${args.join(" ")}" in this system`, "Try: projects"),
    };
  }
  return { project };
}

const COMMANDS: Command[] = [
  {
    name: "help",
    aliases: ["?", "man"],
    help: "list commands",
    run: () => {
      const visible = COMMANDS.filter((c) => !c.hidden);
      const width = Math.max(...visible.map((c) => (c.usage ?? c.name).length)) + 3;
      return result([
        out("Available commands:", "accent"),
        ...visible.map((c) => out(`  ${(c.usage ?? c.name).padEnd(width)}${c.help}`)),
        out("Tab completes, ↑/↓ walks history. Esc closes.", "muted"),
      ]);
    },
  },
  {
    name: "whoami",
    help: "who is behind this ship",
    run: () =>
      result([
        out("Kartik Gupta", "accent"),
        out("Full-stack developer & competitive programmer."),
        out("B.Tech Computer Science @ BVCOE (GGSIPU) · class of 2028 · CGPA 9.13", "muted"),
      ]),
  },
  {
    name: "about",
    help: "a little more about me",
    run: (_a, ctx) =>
      result([
        out("I turn ideas into full-stack products — React and Node on the web side,"),
        out("Python where the work is heavier — and practise algorithms in C++ every day."),
        out(
          `${ctx.stats.questionsSolved}+ problems solved across ${ctx.stats.activeDays} active days so far.`,
          "accent",
        ),
        out("Three hackathon builds and counting: Veriflow, Verdikt, VanDrishti.", "muted"),
      ]),
  },
  {
    name: "projects",
    aliases: ["ls", "planets"],
    help: "list every planet in the system",
    run: (_a, ctx) => {
      const width = Math.max(...ctx.projects.map((p) => p.id.length)) + 2;
      return result([
        ...ctx.projects.map((p, i) =>
          out(`  ${String(i + 1).padStart(2, "0")}  ${p.id.padEnd(width)}${p.tagline}`),
        ),
        out("open <name> flies you there · code <name> opens the repo", "muted"),
      ]);
    },
  },
  {
    name: "open",
    aliases: ["goto", "cd", "visit", "fly"],
    usage: "open <project>",
    help: "fly to a planet",
    takesProject: true,
    run: (args, ctx) => {
      // `cd`, `cd ~` and `cd ..` head home rather than to a planet.
      if (!args.length || ["~", "..", "/"].includes(args[0]!)) {
        return result(
          [out("Returning to launch position.", "muted")],
          [{ type: "scroll", to: "top" }, { type: "close" }],
        );
      }
      const { project, error } = needProject(args, ctx, "open <project>");
      if (!project) return error;
      return result(
        [out(`Plotting course to ${project.name}… engaged.`, "ok")],
        [{ type: "select", id: project.id }, { type: "close" }],
      );
    },
  },
  {
    name: "code",
    aliases: ["repo", "github"],
    usage: "code <project>",
    help: "open a project's source on GitHub",
    takesProject: true,
    run: (args, ctx) => {
      if (!args.length) {
        return result(
          [out(`Opening ${ctx.links.github}`, "ok")],
          [{ type: "open", url: ctx.links.github }],
        );
      }
      const { project, error } = needProject(args, ctx, "code <project>");
      if (!project) return error;
      if (!project.link) return fail(`${project.name} has no public repository`);
      return result(
        [out(`Opening ${project.name} on GitHub ↗`, "ok")],
        [{ type: "open", url: project.link }],
      );
    },
  },
  {
    name: "demo",
    usage: "demo <project>",
    help: "open a project's live demo",
    takesProject: true,
    run: (args, ctx) => {
      const { project, error } = needProject(args, ctx, "demo <project>");
      if (!project) return error;
      if (!project.demo)
        return fail(`${project.name} has no live demo yet`, `Try: code ${project.id}`);
      return result(
        [out(`Launching ${project.name} ↗`, "ok")],
        [{ type: "open", url: project.demo }],
      );
    },
  },
  {
    name: "stats",
    help: "live problem-solving telemetry",
    run: (_a, ctx) => {
      const s = ctx.stats;
      const row = (k: string, v: string | number) => out(`  ${k.padEnd(18)}${v}`);
      return result([
        row("Problems solved", s.questionsSolved),
        row("LeetCode rating", s.leetcodeRating),
        row("Active days", s.activeDays),
        row("Max streak", `${s.maxStreak} days`),
        row("Contests", s.contests),
        out(s.live ? "● live from Codolio" : "○ cached snapshot", s.live ? "ok" : "muted"),
      ]);
    },
  },
  {
    name: "skills",
    aliases: ["stack"],
    help: "the toolkit, by area",
    run: (_a, ctx) =>
      result(ctx.skills.flatMap((g) => [out(g.title, "accent"), out(`  ${g.items.join(" · ")}`)])),
  },
  {
    name: "resume",
    aliases: ["cv"],
    help: "open my résumé",
    run: (_a, ctx) =>
      result(
        [
          out("Opening résumé ↗", "ok"),
          out("Tip: Ctrl+P anywhere on this site prints it, too.", "muted"),
        ],
        [{ type: "open", url: ctx.links.resume }],
      ),
  },
  {
    name: "contact",
    aliases: ["email", "mail"],
    help: "how to reach me",
    run: (_a, ctx) =>
      result([
        out("The fastest way to reach me:", "accent"),
        out(`  ${ctx.links.email}`, "out", `mailto:${ctx.links.email}`),
        out(
          `  ${ctx.links.linkedin.replace(/^https?:\/\/(www\.)?/, "")}`,
          "out",
          ctx.links.linkedin,
        ),
      ]),
  },
  {
    name: "social",
    aliases: ["links"],
    help: "everywhere else I am",
    run: (_a, ctx) =>
      result(
        (
          [
            ["GitHub", ctx.links.github],
            ["LinkedIn", ctx.links.linkedin],
            ["LeetCode", ctx.links.leetcode],
            ["Codolio", ctx.links.codolio],
          ] as const
        ).map(([label, url]) =>
          out(`  ${label.padEnd(10)}${url.replace(/^https?:\/\/(www\.)?/, "")}`, "out", url),
        ),
      ),
  },
  {
    name: "destroy",
    help: "run the destruction simulation",
    run: () =>
      result([out("Impactor inbound. Brace.", "err")], [{ type: "destroy" }, { type: "close" }]),
  },
  {
    name: "date",
    aliases: ["time"],
    help: "mission time, here and in Delhi",
    run: (_a, ctx) => {
      const fmt = (tz?: string) =>
        new Intl.DateTimeFormat("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
          ...(tz ? { timeZone: tz } : {}),
        }).format(ctx.now);
      return result([
        out(`  your time   ${fmt()}`),
        out(`  my time     ${fmt("Asia/Kolkata")} IST`),
      ]);
    },
  },
  {
    name: "echo",
    usage: "echo <text>",
    help: "say something back",
    run: (_a, _c, raw) => result([out(raw.replace(/^\s*\S+\s*/, ""))]),
  },
  {
    name: "clear",
    aliases: ["cls"],
    help: "clear the screen",
    run: () => result([], [{ type: "clear" }]),
  },
  {
    name: "exit",
    aliases: ["quit", "close", "q"],
    help: "close the terminal",
    run: () => result([], [{ type: "close" }]),
  },

  /* ---- easter eggs ---- */
  {
    name: "sudo",
    hidden: true,
    help: "",
    run: (args, ctx) => {
      if (normalize(args.join(" ")) === "hirekartik") {
        return result([
          out("[sudo] password for recruiter: ********", "muted"),
          out("✓ Permission granted.", "ok"),
          out("Drafting offer letter… done.", "ok"),
          out(`Send it to ${ctx.links.email}`, "accent", `mailto:${ctx.links.email}`),
        ]);
      }
      return fail(
        "recruiter is not in the sudoers file. This incident will be reported.",
        "(psst — try: sudo hire kartik)",
      );
    },
  },
  {
    name: "hire",
    hidden: true,
    help: "",
    run: () => result([out("Permission denied. Try: sudo hire kartik", "muted")]),
  },
  {
    name: "rm",
    hidden: true,
    help: "",
    run: () => fail("rm: cannot remove '/': this universe is read-only"),
  },
  {
    name: "hello",
    aliases: ["hi", "hey"],
    hidden: true,
    help: "",
    run: () => result([out("Hey there! Type help to look around.", "accent")]),
  },
];

const byName = new Map<string, Command>();
for (const c of COMMANDS) for (const n of [c.name, ...(c.aliases ?? [])]) byName.set(n, c);

/** Command names shown in `help`, for the UI's hints. */
export const VISIBLE_COMMANDS = COMMANDS.filter((c) => !c.hidden).map((c) => c.name);

export function runCommand(input: string, ctx: TermContext): TermResult {
  const raw = input.trim();
  if (!raw) return result([]);
  const [head = "", ...args] = raw.split(/\s+/);
  const command = byName.get(head.toLowerCase());
  if (!command) return fail(`command not found: ${head}`, "Type help for the list.");
  return command.run(args, ctx, raw);
}

/* ---------- tab completion ---------- */

function commonPrefix(words: string[]): string {
  if (!words.length) return "";
  let prefix = words[0]!;
  for (const w of words) while (!w.startsWith(prefix)) prefix = prefix.slice(0, -1);
  return prefix;
}

export interface Completion {
  /** The input after completing as far as is unambiguous. */
  value: string;
  /** When more than one thing matches, the candidates to show. */
  options: string[];
}

export function complete(input: string, ctx: TermContext): Completion {
  const parts = input.replace(/^\s+/, "").split(/\s+/);

  // Completing the command itself.
  if (parts.length <= 1) {
    const typed = (parts[0] ?? "").toLowerCase();
    const matches = VISIBLE_COMMANDS.filter((n) => n.startsWith(typed));
    if (matches.length === 1) return { value: `${matches[0]} `, options: [] };
    const prefix = commonPrefix(matches);
    return { value: prefix.length > typed.length ? prefix : input, options: matches };
  }

  // Completing a project name after a command that takes one.
  const command = byName.get(parts[0]!.toLowerCase());
  if (!command?.takesProject) return { value: input, options: [] };
  const typed = parts.slice(1).join(" ").toLowerCase();
  const matches = ctx.projects.map((p) => p.id).filter((id) => id.startsWith(typed));
  if (matches.length === 1) return { value: `${parts[0]} ${matches[0]}`, options: [] };
  const prefix = commonPrefix(matches);
  return {
    value: prefix.length > typed.length ? `${parts[0]} ${prefix}` : input,
    options: matches,
  };
}

/* ---------- boot banner ---------- */

// A 5-row block font for the banner, drawn from a glyph table rather than
// pasted art so every row is guaranteed to line up.
const GLYPHS: Record<string, string[]> = {
  K: ["█  █", "█ █ ", "██  ", "█ █ ", "█  █"],
  A: [" ██ ", "█  █", "████", "█  █", "█  █"],
  R: ["███ ", "█  █", "███ ", "█ █ ", "█  █"],
  T: ["█████", "  █  ", "  █  ", "  █  ", "  █  "],
  I: ["███", " █ ", " █ ", " █ ", "███"],
};

export function bannerRows(word: string): string[] {
  const letters = [...word.toUpperCase()].map((c) => GLYPHS[c]).filter(Boolean) as string[][];
  return Array.from({ length: 5 }, (_, row) => letters.map((g) => g[row]).join(" "));
}

export function bootLines(): TermLine[] {
  return [
    ...bannerRows("KARTIK").map((r) => out(r, "art")),
    out(""),
    out("KARTIK·OS — mission control terminal", "out"),
    out("Type help to see what this ship can do.", "muted"),
  ];
}
