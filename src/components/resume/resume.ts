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
      "HTML, CSS, ReactJS, Node.js, Express.js, MongoDB, Socket.io, Tailwind CSS, Chakra UI",
    ],
    [
      "CS Fundamentals",
      "Data Structures & Algorithms (C++), DBMS, Operating Systems, Computer Networks, OOP",
    ],
    ["Python Libraries", "Pandas, NumPy, Matplotlib"],
    ["Tools & Platforms", "Git, GitHub, VS Code"],
  ] as const,

  education: {
    school: "Bharati Vidyapeeth College of Engineering (GGSIPU)",
    years: "2024 – 2028",
    detail: "Bachelor of Technology (B.Tech), Computer Science | CGPA: 9.13/10 — New Delhi, India",
  },

  projects: [
    {
      title: "ArtMart",
      subtitle: "Full-Stack Photography Marketplace",
      stack: "MERN Stack, Tailwind CSS, JWT Auth, Groq AI (Llama 3.3), ImageKit, Multer",
      points: [
        "Built a full-stack photography marketplace (React 19, Node.js/Express, MongoDB) enabling photographers to upload, list, and sell photos, with JWT-based auth and role-based access control (buyer vs. photographer).",
        "Architected the backend in a layered pattern (routes → controllers → services → repositories) with a transactional purchase flow coordinating writes across Photo, User, and Transaction collections.",
        "Integrated AI-assisted seller tools via the Groq API (Llama 3.3 70B) for auto-generated descriptions and pricing, plus an AI image-generation pipeline; handled image hosting with Multer + ImageKit and deployed on Vercel.",
      ],
    },
    {
      title: "Chattify",
      subtitle: "Real-Time Chat Application",
      stack: "MERN Stack, Socket.io, JWT Auth, Chakra UI, Tailwind CSS, Framer Motion",
      points: [
        "Built a full-stack real-time chat app (React 19, Node.js/Express, MongoDB) supporting one-on-one and group conversations with JWT-based authentication and bcrypt password hashing.",
        "Implemented real-time messaging, live typing indicators, and instant delivery via Socket.io with room-based broadcasting, plus message read-receipt tracking.",
        "Designed group chat management (admin controls, add/remove members) and a responsive, animated UI with Chakra UI, Tailwind CSS, and Framer Motion; deployed on Vercel.",
      ],
    },
    {
      title: "Subreddit Vibe Check",
      subtitle: "Reddit Sentiment Analyzer",
      stack: "React, Node.js/Express, Tailwind CSS, Sentiment (AFINN), RSS Parsing",
      points: [
        'Built a real-time dashboard that parses a subreddit\'s RSS feed and scores post sentiment (AFINN) to surface an overall community "vibe," with an animated React/Tailwind UI and per-post breakdowns.',
      ],
    },
  ] satisfies ResumeProject[],

  other: {
    title: "Other Projects & Practice",
    points: [
      "Data Analysis with Python: Performed data manipulation and visualization using Pandas, NumPy, and Matplotlib to derive insights from structured datasets.",
      "Consistent DSA Practice: Actively solve algorithmic problems in C++; coding profile available on Codolio (codolio.com/profile/Kartik9696).",
    ],
  },

  strengths: [
    "Strong problem-solving ability, with consistent algorithmic practice",
    "Fast learner, able to pick up new tools, frameworks, and technologies quickly",
    "Disciplined and consistent, with strong follow-through on long-term goals",
  ],
};
