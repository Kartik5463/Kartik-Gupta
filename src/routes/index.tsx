import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Code2, Briefcase, Terminal, Mail, ArrowDown, Orbit, Trophy, Flame, Target, Calendar, Satellite, Star, ArrowUpRight } from "lucide-react";
import { PROFILE } from "@/components/space/planets";
import { spaceStore } from "@/components/space/store";
import { ProjectPanel } from "@/components/space/ProjectPanel";
import { useCodolioStats, useProjects } from "@/components/space/useLiveData";

const SpaceScene = lazy(() => import("@/components/space/SpaceScene"));
const RESUME_URL = "https://drive.google.com/file/d/18wDydnAxDdXmOofp9OW0JsO5-r9HS4yt/view?usp=sharing";

function RocketCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || window.matchMedia("(pointer: coarse)").matches) return;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const move = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
        frame = 0;
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return <div ref={cursorRef} aria-hidden="true" className="alien-cursor"><svg viewBox="0 0 48 48" fill="none"><path d="M8 21C8 10.5 14.5 4 24 4s16 6.5 16 17c0 9.7-7.2 18-16 18S8 30.7 8 21Z" fill="#8CFF8B" stroke="#19351C" strokeWidth="2"/><path d="M14 20c0-3.6 2.3-6 5-6s5 2.4 5 6-2.3 6-5 6-5-2.4-5-6ZM25 20c0-3.6 2.3-6 5-6s5 2.4 5 6-2.3 6-5 6-5-2.4-5-6Z" fill="#101522"/><circle cx="17.5" cy="18.5" r="1.2" fill="white"/><circle cx="28.5" cy="18.5" r="1.2" fill="white"/><path d="M19 31c3 2 7 2 10 0M13 39l-4 5m26-5 4 5M7 28l-5 2m44-2 5 2" stroke="#8CFF8B" strokeWidth="2" strokeLinecap="round"/><path d="m24 1 2 3-2 3-2-3 2-3Z" fill="var(--primary)"/></svg></div>;
}

function DestructionEffect({ active, onComplete }: { active: boolean; onComplete: () => void }) {
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(onComplete, 10_000);
    return () => window.clearTimeout(timer);
  }, [active, onComplete]);
  if (!active) return null;
  return (
    <div className="destruction-effect" aria-hidden="true">
      <div className="destruction-effect__asteroid"><span /></div>
      <div className="destruction-effect__blast" />
      <div className="destruction-effect__debris"><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="destruction-effect__message">SOLAR SYSTEM REBOOTING</div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kartik Gupta - Full-Stack Developer & Competitive Programmer" },
      {
        name: "description",
        content:
          "Explore Kartik Gupta's universe: a 3D solar system portfolio of projects, 776+ DSA problems solved and a 1526 LeetCode rating.",
      },
      { property: "og:title", content: "Kartik Gupta - Space Portfolio" },
      {
        property: "og:description",
        content: "A 3D solar-system portfolio where every project is a planet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SOCIALS = [
  { label: "GitHub", href: PROFILE.links.github, Icon: Code2 },
  { label: "LinkedIn", href: PROFILE.links.linkedin, Icon: Briefcase },
  { label: "LeetCode", href: PROFILE.links.leetcode, Icon: Terminal },
  { label: "Codolio", href: PROFILE.links.codolio, Icon: Orbit },
];

function IntroOverlay() {
  return (
    <div className="animate-intro-overlay pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <p className="animate-intro-logo font-mono text-sm uppercase text-primary">Kartik Gupta</p>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        Initializing universe
      </p>
      <div className="mt-6 h-px w-48 overflow-hidden rounded-full bg-secondary">
        <div className="animate-intro-bar h-full bg-primary" />
      </div>
    </div>
  );
}

function Index() {
  const s = useCodolioStats();
  const { planets, live: projectsLive } = useProjects();
  const [destroying, setDestroying] = useState(false);
  const finishDestruction = useCallback(() => setDestroying(false), []);
  const total = s.easy + s.medium + s.hard;
  const maxTopic = s.topics[0]?.count ?? 1;

  // Hand the live repo list to the 3D scene and the project panel.
  useEffect(() => {
    spaceStore.set({ planets });
  }, [planets]);

  return (
    <div className="relative">
      <IntroOverlay />
      <RocketCursor />
      <DestructionEffect active={destroying} onComplete={finishDestruction} />

      {/* 3D universe behind everything */}
      <div className="animate-intro-zoom fixed inset-0 z-0">
        <ClientOnly fallback={<div className="h-full w-full bg-background" />}>
          <Suspense fallback={<div className="h-full w-full bg-background" />}>
            <SpaceScene />
          </Suspense>
        </ClientOnly>
      </div>

      <ProjectPanel />

      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-30">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="#top" className="font-display text-lg font-bold tracking-tight">
            KG<span className="text-primary">.</span>
          </a>
          <div className="panel hidden items-center gap-1 rounded-full px-2 py-1.5 md:flex">
            {["About", "Projects", "Skills", "Stats", "Contact"].map((x) => (
              <a key={x} href={`#${x.toLowerCase()}`} className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground">
                {x}
              </a>
            ))}
          </div>
          <a href={RESUME_URL} target="_blank" rel="noreferrer" className="rounded-full border border-primary/50 px-4 py-2 text-sm text-primary transition hover:bg-primary hover:text-primary-foreground">Resume ↗</a>
        </nav>
      </header>

      <main className="pointer-events-none relative z-10 [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_.pe]:pointer-events-auto">
        {/* Hero */}
        <section id="top" className="flex min-h-screen flex-col justify-center px-6">
          <div className="mx-auto w-full max-w-6xl">
            <p className="animate-intro-up font-mono text-xs uppercase tracking-[0.35em] text-primary" style={{ animationDelay: "1.7s" }}>
              Mission log | {PROFILE.location}
            </p>
            <h1 className="animate-intro-up mt-5 text-6xl font-bold leading-[0.95] tracking-tight text-glow md:text-8xl" style={{ animationDelay: "1.85s" }}>
              Kartik
              <br />
              Gupta
            </h1>
            <p className="animate-intro-up mt-6 max-w-lg text-lg text-muted-foreground" style={{ animationDelay: "2s" }}>
              {PROFILE.title}. Building products in orbit around clean code and sharp algorithms.
            </p>
            <div className="animate-intro-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: "2.15s" }}>
              <a href="#projects" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                Explore the system
              </a>
              <button type="button" disabled={destroying} onClick={() => setDestroying(true)} className="rounded-full border border-destructive/60 px-5 py-3 font-mono text-xs uppercase tracking-widest text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50">
                {destroying ? "Rebooting..." : "Destroy simulation"}
              </button>
              {SOCIALS.slice(0, 3).map(({ label, href, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="panel rounded-full p-3 transition hover:text-primary">
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
          <div className="animate-drift absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Scroll to travel <ArrowDown className="h-4 w-4" />
          </div>
        </section>

        {/* About */}
        <section id="about" className="px-6 py-28">
          <div className="pe glass-panel mx-auto max-w-3xl rounded-3xl p-8 md:p-12">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">01 — About me</p>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">Software engineer in the making. Builder by instinct.</h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">I'm Kartik Gupta, a B.Tech Computer Science student at {PROFILE.college} (GGSIPU), graduating in 2028 with a 9.13 CGPA. I enjoy turning ideas into useful full-stack products and strengthening them with thoughtful engineering. Alongside building, I practice data structures and algorithms consistently — {s.questionsSolved}+ problems solved and counting. I'm curious, disciplined, and always ready to learn a new tool or take on a challenging problem.</p>
            <a href={RESUME_URL} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">View resume ↗</a>
          </div>
        </section>
        <section id="skills" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">02 — Toolkit</p>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">Tools &amp; technologies.</h2>
            <p className="mt-4 max-w-xl text-muted-foreground">The languages, frameworks and tools I use to turn ideas into working software.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Languages", items: ["C++", "C", "Java", "Python", "JavaScript", "SQL · MySQL"] },
                { title: "Web development", items: ["HTML", "CSS", "React", "Node.js", "Express.js", "MongoDB", "Socket.io", "Tailwind CSS", "Chakra UI"] },
                { title: "Python libraries", items: ["Pandas", "NumPy", "Matplotlib"] },
                { title: "Tools & platforms", items: ["Git", "GitHub", "VS Code", "Vercel"] },
                { title: "Core foundations", items: ["Data structures & algorithms", "Object-oriented programming", "DBMS", "Operating systems", "Computer networks"] },
              ].map((group) => <div key={group.title} className="panel rounded-2xl p-6"><h3 className="font-mono text-sm text-primary">{group.title}</h3><div className="mt-4 flex flex-wrap gap-2">{group.items.map((item) => <span key={item} className="rounded-full border border-foreground/10 bg-secondary/70 px-3 py-1.5 text-sm text-secondary-foreground">{item}</span>)}</div></div>)}
            </div>
          </div>
        </section>

        {/* Projects */}
        <section id="projects" className="px-6 py-28">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">03 - Projects</p>
              <h2 className="mt-4 text-4xl font-bold md:text-5xl">Every project is a planet.</h2>
              <p className="mt-4 text-muted-foreground">
                My {planets.length} most active repositories, pulled straight from GitHub. Click any
                planet in the sky - or a card below - to fly to it.
              </p>
              {projectsLive && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-aurora/40 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-aurora">
                  <Satellite className="h-3 w-3" /> Live from GitHub
                </p>
              )}
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {planets.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => spaceStore.set({ selected: p.id })}
                  onMouseEnter={() => spaceStore.set({ hovered: p.id })}
                  onMouseLeave={() => spaceStore.set({ hovered: null })}
                  className="panel group rounded-2xl p-6 text-left transition hover:-translate-y-1"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, ${p.glow}, ${p.color} 60%, transparent 100%)`, boxShadow: `0 0 24px ${p.glow}66` }} />
                    <span className="font-mono text-xs text-muted-foreground">PLANET {String(i + 1).padStart(2, "0")}</span>
                    {!!p.stars && (
                      <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Star className="h-3 w-3" /> {p.stars}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-xl font-bold transition group-hover:text-primary">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.tech.map((t) => (
                      <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[11px] text-secondary-foreground">{t}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section id="stats" className="px-6 py-28">
          <div className="mx-auto max-w-6xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">04 - Telemetry</p>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">Problem-solving stats.</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {s.live && (
                <p className="inline-flex items-center gap-2 rounded-full border border-aurora/40 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-aurora">
                  <Satellite className="h-3 w-3" /> Live from Codolio
                </p>
              )}
              <a
                href={PROFILE.links.codolio}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <Orbit className="h-4 w-4" /> Codolio profile{" "}
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                href={PROFILE.links.leetcode}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-accent"
              >
                <Terminal className="h-4 w-4" /> LeetCode profile{" "}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { Icon: Target, v: s.questionsSolved, l: "Questions solved" },
                { Icon: Trophy, v: s.leetcodeRating, l: "LeetCode rating" },
                { Icon: Flame, v: `${s.maxStreak}d`, l: "Max streak" },
                { Icon: Calendar, v: s.activeDays, l: "Active days" },
              ].map(({ Icon, v, l }) => (
                <div key={l} className="pe panel rounded-2xl p-6">
                  <Icon className="h-5 w-5 text-primary" />
                  <div className="mt-4 font-display text-4xl font-bold">{v}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="pe panel rounded-2xl p-6">
                <h3 className="font-semibold">By difficulty</h3>
                <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-secondary">
                  <div className="bg-aurora" style={{ width: `${(s.easy / total) * 100}%` }} />
                  <div className="bg-primary" style={{ width: `${(s.medium / total) * 100}%` }} />
                  <div className="bg-destructive" style={{ width: `${(s.hard / total) * 100}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div><span className="text-aurora">●</span> Easy <b className="ml-1">{s.easy}</b></div>
                  <div><span className="text-primary">●</span> Medium <b className="ml-1">{s.medium}</b></div>
                  <div><span className="text-destructive">●</span> Hard <b className="ml-1">{s.hard}</b></div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2 border-t pt-5 text-sm text-muted-foreground">
                  <div><div className="font-display text-2xl font-bold text-foreground">{s.contests}</div>Contests</div>
                  <div><div className="font-display text-2xl font-bold text-foreground">{s.badges}</div>Badges</div>
                  <div><div className="font-display text-2xl font-bold text-foreground">{s.submissions.toLocaleString()}</div>Submissions</div>
                </div>
              </div>
              <div className="pe panel rounded-2xl p-6">
                <h3 className="font-semibold">Top DSA topics</h3>
                <div className="mt-5 space-y-3">
                  {s.topics.map((t) => (
                    <div key={t.name}>
                      <div className="flex justify-between text-sm"><span>{t.name}</span><span className="font-mono text-muted-foreground">{t.count}</span></div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-comet" style={{ width: `${(t.count / maxTopic) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="px-6 py-24 md:py-32">
          <div className="glass-panel mx-auto grid max-w-6xl items-center gap-12 rounded-3xl p-8 md:grid-cols-2 md:gap-16 md:p-14">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">05 — Contact</p>
              <h2 className="mt-5 text-5xl font-bold text-glow md:text-7xl">Let's talk<span className="text-primary">.</span></h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">For opportunities, collaboration or questions about my work, email is the best way to reach me.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="mailto:kg9818630@gmail.com" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-mono text-sm font-semibold text-primary-foreground shadow-[4px_4px_0_var(--foreground)] transition hover:-translate-y-0.5"><Mail className="h-4 w-4" /> Send an email <span aria-hidden="true">→</span></a>
                <a href="mailto:kg9818630@gmail.com" className="panel inline-flex items-center rounded-xl px-5 py-3.5 font-mono text-sm transition hover:text-primary">kg9818630@gmail.com</a>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {SOCIALS.map(({ label, href }, i) => <span key={label} className="inline-flex items-center gap-3">{i > 0 && <span aria-hidden="true">·</span>}<a href={href} target="_blank" rel="noreferrer" className="transition hover:text-primary">{label}</a></span>)}
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-foreground/15 bg-[#080b12] font-mono text-sm shadow-[8px_8px_0_color-mix(in_oklab,var(--foreground)_35%,transparent)]">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-3"><div className="flex gap-2" aria-hidden="true"><span className="h-3 w-3 rounded-full bg-destructive" /><span className="h-3 w-3 rounded-full bg-primary" /><span className="h-3 w-3 rounded-full bg-aurora" /></div><span className="text-xs text-muted-foreground">kartik@space: ~</span></div>
              <div className="space-y-5 p-5 text-sm md:p-6">
                <div><p><span className="mr-3 text-primary">$</span>whoami</p><p className="mt-1 pl-5 text-aurora">→ Kartik Gupta</p></div>
                <div><p><span className="mr-3 text-primary">$</span>cat focus.txt</p><p className="mt-1 pl-5 text-aurora">→ Full-stack development &amp; problem solving</p></div>
                <div><p><span className="mr-3 text-primary">$</span>ls ~/projects</p><p className="mt-1 pl-5 text-aurora">→ {planets.slice(0, 3).map((p) => p.name.toLowerCase().replaceAll(" ", "-")).join("  ")}</p></div>
                <div><p><span className="mr-3 text-primary">$</span>cat approach.txt</p><p className="mt-1 pl-5 text-aurora">→ Build with curiosity. Keep learning.</p></div>
                <p className="text-primary">$ <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle" /></p>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-6xl text-center font-mono text-xs text-muted-foreground">© {new Date().getFullYear()} Kartik Gupta · Crafted among the stars</p>
        </section>
      </main>
    </div>
  );
}


