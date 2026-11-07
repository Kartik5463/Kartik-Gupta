import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { PrintResume } from "@/components/resume/PrintResume";
import { RESUME } from "@/components/resume/resume";

afterEach(cleanup);

describe("print résumé", () => {
  it("renders the name, every section and every project", () => {
    render(<PrintResume />);

    expect(screen.getByRole("heading", { level: 1, name: RESUME.name })).toBeInTheDocument();
    for (const section of [
      "Professional Summary",
      "Technical Skills",
      "Education",
      "Projects",
      "Strengths",
    ])
      expect(screen.getByRole("heading", { level: 2, name: section })).toBeInTheDocument();
    for (const p of RESUME.projects)
      expect(screen.getByText(`${p.title} — ${p.subtitle}`)).toBeInTheDocument();
  });

  it("links each contact that has a URL", () => {
    render(<PrintResume />);

    for (const c of RESUME.contact.filter((c) => c.href))
      expect(screen.getByRole("link", { name: c.label })).toHaveAttribute("href", c.href);
  });

  it("names the saved PDF after the résumé while printing, then restores the title", () => {
    document.title = "Kartik Gupta - Full-Stack Developer";
    render(<PrintResume />);

    window.dispatchEvent(new Event("beforeprint"));
    expect(document.title).toBe(`${RESUME.name} - Resume`);

    window.dispatchEvent(new Event("afterprint"));
    expect(document.title).toBe("Kartik Gupta - Full-Stack Developer");
  });

  it("stops touching the title once unmounted", () => {
    document.title = "untouched";
    render(<PrintResume />).unmount();

    window.dispatchEvent(new Event("beforeprint"));
    expect(document.title).toBe("untouched");
  });
});
