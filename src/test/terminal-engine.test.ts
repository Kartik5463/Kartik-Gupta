import { describe, expect, it } from "vitest";

import { SKILL_GROUPS } from "@/components/content/skills";
import {
  bannerRows,
  bootLines,
  complete,
  findProject,
  runCommand,
  VISIBLE_COMMANDS,
  type TermContext,
} from "@/components/terminal/engine";

const ctx: TermContext = {
  projects: [
    {
      id: "sound2song",
      name: "Sound2Song",
      tagline: "YouTube Song Identifier",
      link: "https://github.com/x/Sound2Song",
    },
    {
      id: "subreddit-vibe-check",
      name: "Subreddit Vibe Check",
      tagline: "Sentiment Analyzer",
      link: "https://github.com/x/svc",
      demo: "https://svc.example",
    },
    {
      id: "veriflow",
      name: "Veriflow",
      tagline: "AI-Verified Escrow on PayPal",
      link: "https://github.com/y/Veriflow",
      demo: "https://veriflow.example",
    },
    {
      id: "verdikt",
      name: "Verdikt",
      tagline: "Hackathon Hosting Platform",
      link: "https://github.com/z/Verdikt",
    },
  ],
  stats: {
    questionsSolved: 810,
    leetcodeRating: 1562,
    activeDays: 404,
    maxStreak: 118,
    contests: 11,
    live: true,
  },
  skills: SKILL_GROUPS,
  links: {
    github: "https://github.com/Kartik5463",
    linkedin: "https://www.linkedin.com/in/someone",
    leetcode: "https://leetcode.com/u/someone",
    codolio: "https://codolio.com/profile/someone",
    resume: "https://drive.example/resume",
    email: "me@example.com",
  },
  now: new Date("2026-11-21T08:30:00Z"),
};

const text = (input: string) =>
  runCommand(input, ctx)
    .lines.map((l) => l.text)
    .join("\n");
const effects = (input: string) => runCommand(input, ctx).effects;

describe("findProject", () => {
  it("matches exactly, by prefix, and loosely", () => {
    expect(findProject("Veriflow", ctx.projects)?.id).toBe("veriflow");
    expect(findProject("sound", ctx.projects)?.id).toBe("sound2song");
    expect(findProject("subreddit vibe", ctx.projects)?.id).toBe("subreddit-vibe-check");
    expect(findProject("vibe", ctx.projects)?.id).toBe("subreddit-vibe-check");
  });

  it("prefers an exact match over a prefix one", () => {
    // "verdikt" is also a prefix-neighbour of "veriflow" — exact must win.
    expect(findProject("verdikt", ctx.projects)?.id).toBe("verdikt");
  });

  it("finds nothing for blank or unknown input", () => {
    expect(findProject("  ", ctx.projects)).toBeUndefined();
    expect(findProject("bookify", ctx.projects)).toBeUndefined();
  });
});

describe("runCommand", () => {
  it("does nothing for an empty line", () => {
    expect(runCommand("   ", ctx)).toEqual({ lines: [], effects: [] });
  });

  it("explains unknown commands", () => {
    const r = runCommand("fly-me-to-the-moon", ctx);
    expect(r.lines[0]).toMatchObject({
      tone: "err",
      text: "command not found: fly-me-to-the-moon",
    });
    expect(r.effects).toEqual([]);
  });

  it("lists every visible command in help, and no easter eggs", () => {
    const help = text("help");
    for (const name of VISIBLE_COMMANDS) expect(help).toContain(name);
    expect(help).not.toMatch(/\bsudo\b|\brm\b/);
  });

  it("is case-insensitive about the command", () => {
    expect(text("WHOAMI")).toContain("Kartik Gupta");
  });

  it("lists the projects", () => {
    const list = text("projects");
    for (const p of ctx.projects) expect(list).toContain(p.id);
    expect(text("ls")).toBe(list);
  });

  it("flies to a planet and closes the console", () => {
    expect(effects("open veriflow")).toEqual([
      { type: "select", id: "veriflow" },
      { type: "close" },
    ]);
    expect(effects("goto vibe")).toEqual([
      { type: "select", id: "subreddit-vibe-check" },
      { type: "close" },
    ]);
  });

  it("sends cd home rather than to a planet", () => {
    for (const cmd of ["cd", "cd ~", "cd .."]) {
      expect(effects(cmd)).toEqual([{ type: "scroll", to: "top" }, { type: "close" }]);
    }
  });

  it("reports an unknown planet without any effect", () => {
    const r = runCommand("open bookify", ctx);
    expect(r.lines[0]?.tone).toBe("err");
    expect(r.effects).toEqual([]);
  });

  it("asks for a project when one is required", () => {
    expect(text("demo")).toContain("usage: demo <project>");
  });

  it("opens repos and demos, and says when a demo doesn't exist", () => {
    expect(effects("code verdikt")).toEqual([
      { type: "open", url: "https://github.com/z/Verdikt" },
    ]);
    expect(effects("demo veriflow")).toEqual([{ type: "open", url: "https://veriflow.example" }]);
    const none = runCommand("demo verdikt", ctx);
    expect(none.effects).toEqual([]);
    expect(none.lines[0]?.text).toContain("no live demo");
  });

  it("opens the GitHub profile when code is given no project", () => {
    expect(effects("code")).toEqual([{ type: "open", url: ctx.links.github }]);
  });

  it("reports live stats and says where they came from", () => {
    const s = text("stats");
    expect(s).toContain("810");
    expect(s).toContain("1562");
    expect(s).toContain("live from Codolio");
    const cached = runCommand("stats", { ...ctx, stats: { ...ctx.stats, live: false } });
    expect(cached.lines.at(-1)?.text).toContain("cached snapshot");
  });

  it("prints every skill group", () => {
    const s = text("skills");
    for (const g of SKILL_GROUPS) expect(s).toContain(g.title);
  });

  it("opens the résumé", () => {
    expect(effects("resume")).toEqual([{ type: "open", url: ctx.links.resume }]);
  });

  it("gives contact lines that link", () => {
    const lines = runCommand("contact", ctx).lines;
    expect(lines.some((l) => l.href === `mailto:${ctx.links.email}`)).toBe(true);
  });

  it("triggers the destruction sequence", () => {
    expect(effects("destroy")).toEqual([{ type: "destroy" }, { type: "close" }]);
  });

  it("shows both time zones", () => {
    const t = text("date");
    expect(t).toContain("IST");
    expect(t).toContain("14:00"); // 08:30 UTC is 14:00 in Delhi
  });

  it("echoes the rest of the line verbatim", () => {
    expect(text("echo   hello   world")).toBe("hello   world");
  });

  it("clears and closes", () => {
    expect(effects("clear")).toEqual([{ type: "clear" }]);
    expect(effects("exit")).toEqual([{ type: "close" }]);
  });

  it("grants sudo only for the one command that matters", () => {
    expect(text("sudo hire kartik")).toContain("Permission granted");
    expect(text("sudo rm -rf /")).toContain("not in the sudoers file");
  });
});

describe("complete", () => {
  it("completes a unique command", () => {
    expect(complete("who", ctx)).toEqual({ value: "whoami ", options: [] });
  });

  it("offers the options when the command is ambiguous", () => {
    const c = complete("s", ctx);
    expect(c.options).toEqual(expect.arrayContaining(["stats", "skills", "social"]));
  });

  it("completes project names after a command that takes one", () => {
    expect(complete("open sou", ctx)).toEqual({ value: "open sound2song", options: [] });
  });

  it("extends to the shared prefix of ambiguous projects", () => {
    const c = complete("open ver", ctx);
    expect(c.options).toEqual(["veriflow", "verdikt"]);
    expect(c.value).toBe("open ver");
  });

  it("leaves input alone where nothing applies", () => {
    expect(complete("echo something", ctx)).toEqual({ value: "echo something", options: [] });
  });
});

describe("boot banner", () => {
  it("draws every row the same width, so the art lines up", () => {
    const rows = bannerRows("KARTIK");
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((r) => r.length)).size).toBe(1);
  });

  it("fits a phone-width terminal", () => {
    expect(bannerRows("KARTIK")[0]!.length).toBeLessThanOrEqual(36);
  });

  it("ends by pointing at help", () => {
    expect(bootLines().at(-1)?.text).toContain("help");
  });
});
