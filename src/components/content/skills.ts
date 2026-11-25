// The skills shown on the site — as constellations in the Toolkit section and
// through the terminal's `skills` command. Keep in step with the résumé
// (src/components/resume/resume.ts).

export interface SkillGroup {
  title: string;
  items: string[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    title: "Languages",
    items: ["C++", "C", "Java", "Python", "JavaScript", "SQL · MySQL"],
  },
  {
    title: "Web development",
    items: [
      "HTML",
      "CSS",
      "React",
      "Node.js",
      "Express.js",
      "MongoDB",
      "Socket.io",
      "FastAPI",
      "Tailwind CSS",
      "Chakra UI",
    ],
  },
  { title: "Python libraries", items: ["Pandas", "NumPy", "Matplotlib"] },
  { title: "Tools & platforms", items: ["Git", "GitHub", "Docker", "VS Code", "Vercel"] },
  {
    title: "Core foundations",
    items: [
      "Data structures & algorithms",
      "Object-oriented programming",
      "DBMS",
      "Operating systems",
      "Computer networks",
    ],
  },
];
