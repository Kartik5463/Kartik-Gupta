// The résumé that prints when someone presses Ctrl+P on the portfolio.
//
// Mirrors the PDF linked from the "Resume" button — keep the two in step when
// either changes. Pure data, so the print layout lives in PrintResume.tsx.

export interface ResumeLink {
  label: string;
  href?: string;
}

export interface ResumeProject {
  title: string;
  subtitle: string;
  stack: string;
  points: string[];
}

export const RESUME = {
  name: "Kartik Gupta",
  role: "Software Engineer Intern | B.Tech Computer Science",
  contact: [
    { label: "India" },
    { label: "+91 93183 05764", href: "tel:+919318305764" },
    { label: "kg9818630@gmail.com", href: "mailto:kg9818630@gmail.com" },
    { label: "github.com/Kartik5463", href: "https://github.com/Kartik5463" },
    {
      label: "linkedin.com/in/kartik-gupta-395727327",
      href: "https://www.linkedin.com/in/kartik-gupta-395727327",
    },
    { label: "codolio.com/profile/Kartik9696", href: "https://codolio.com/profile/Kartik9696" },
  ] satisfies ResumeLink[],

  summary:
    "B.Tech Computer Science student (Batch 2024–2028) at Bharati Vidyapeeth College of Engineering (IPU) with a CGPA of 9.13/10. Strong foundation in Data Structures & Algorithms and full-stack web development (MERN stack), with hands-on proficiency in C++, Python, Java, and JavaScript. Focused on writing clean, efficient code and building production-quality software, with a consistent problem-solving practice and a track record of quickly picking up new tools and technologies.",

  skills: [
    ["Languages", "C++, C, Java, Python, JavaScript, SQL (MySQL)"],
    [
      "Web Development",
      "HTML, CSS, ReactJS, Node.js, Express.js, MongoDB, Socket.io, FastAPI, Tailwind CSS, Chakra UI",
    ],
    [
      "CS Fundamentals",
      "Data Structures & Algorithms (C++), DBMS, Operating Systems, Computer Networks, OOP",
    ],
    ["Python Libraries", "Pandas, NumPy, Matplotlib"],
    ["Tools & Platforms", "Git, GitHub, Docker, VS Code"],
  ] as const,

  education: {
    school: "Bharati Vidyapeeth College of Engineering (GGSIPU)",
    years: "2024 – 2028",
    detail: "Bachelor of Technology (B.Tech), Computer Science | CGPA: 9.13/10 — New Delhi, India",
  },

  projects: [
    {
      title: "Veriflow",
      subtitle: "AI-Verified Escrow on PayPal (PayPal AI Hackathon)",
      stack:
        "React 19, Node.js/Express, MongoDB, PayPal Orders API v2, Google Gemini, Playwright, AG Grid",
      points: [
        "Co-built, in a team of 3, a pay-on-proof escrow service: the PayPal Orders API v2 holds the buyer's payment, which is captured or voided only after automated checks verify the delivered work.",
        "Google Gemini (with a Groq fallback) turns a plain-English job into a buyer-approved checklist that serves as the contract; checkers verify GitHub pull requests and live websites using Playwright, AI-judged screenshots and Lighthouse.",
      ],
    },
    {
      title: "Verdikt",
      subtitle: "Self-Hosted Hackathon Platform (Dogfood Hackathon)",
      stack: "React, TypeScript, Tailwind CSS, Node.js/Express, MongoDB, Docker",
      points: [
        "Co-built, in a team of 3, a platform that runs a hackathon end to end (teams, submissions, judging, results) as three Docker containers started with a single docker compose up.",
        "Per-event roles enforced in the API, weighted-rubric judging with cross-judge score normalization, and a layered Express API over a MongoDB replica set, covered by 295 HTTP-level tests.",
      ],
    },
    {
      title: "Sound2Song",
      subtitle: "YouTube Song Identifier",
      stack: "React, Tailwind CSS, Node.js/Express, MongoDB, Python, FastAPI, FFmpeg, yt-dlp",
      points: [
        "Built a three-service app (React client, Express API, Python FastAPI audio service) that identifies the songs in a YouTube video or uploaded file, with title, artist and the time range each one plays.",
        "Audio pipeline with yt-dlp and FFmpeg detects silences and song changes, then spends a tight Shazam request budget on the segments most likely to differ; results are cached in MongoDB.",
      ],
    },
    {
      title: "Chattify",
      subtitle: "Real-Time Chat Application",
      stack: "MERN Stack, Socket.io, JWT Auth, Chakra UI, Tailwind CSS, Framer Motion",
      points: [
        "Built a full-stack real-time chat app (React 19, Node.js/Express, MongoDB) for one-on-one and group conversations, with JWT authentication and bcrypt password hashing.",
        "Real-time messaging, typing indicators and read receipts via Socket.io room-based broadcasting; group admin controls and an animated UI with Chakra UI and Framer Motion; deployed on Vercel.",
      ],
    },
    {
      title: "Subreddit Vibe Check",
      subtitle: "Reddit Sentiment Analyzer",
      stack: "React, Node.js/Express, Tailwind CSS, Sentiment (AFINN), RSS Parsing",
      points: [
        `Real-time dashboard that parses a subreddit's RSS feed and scores post sentiment (AFINN) to surface the community's overall "vibe", with per-post breakdowns.`,
      ],
    },
  ] satisfies ResumeProject[],

  other: {
    title: "Other Projects & Practice",
    points: [
      "Data analysis with Python: data manipulation and visualization using Pandas, NumPy and Matplotlib.",
      "Consistent DSA practice in C++; coding profile on Codolio (codolio.com/profile/Kartik9696).",
    ],
  },

  strengths: [
    "Strong problem-solving ability, with consistent algorithmic practice",
    "Fast learner, able to pick up new tools, frameworks, and technologies quickly",
    "Disciplined and consistent, with strong follow-through on long-term goals",
  ],
};
