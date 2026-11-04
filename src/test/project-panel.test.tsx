import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ProjectPanel } from "@/components/space/ProjectPanel";
import { FEATURED, repoUrl } from "@/components/space/planets";
import { spaceStore } from "@/components/space/store";

afterEach(() => {
  cleanup();
  spaceStore.set({ selected: null });
});

/** The panel is what opens when a planet is clicked. */
function openPanelFor(repo: string) {
  spaceStore.set({ selected: repo.toLowerCase() });
  render(<ProjectPanel />);
}

describe("clicking a planet", () => {
  it.each(FEATURED.filter((f) => !f.pending).map((f) => [f.name ?? f.repo, f] as const))(
    "shows a View code link for %s",
    (_name, entry) => {
      openPanelFor(entry.repo);

      const link = screen.getByRole("link", { name: /view code/i });

      expect(link).toHaveAttribute("href", repoUrl(entry));
      expect(link).toHaveAttribute("target", "_blank");
    },
  );

  it("links team-org projects to their org, not the personal account", () => {
    for (const entry of FEATURED.filter((f) => f.owner)) {
      openPanelFor(entry.repo);

      expect(screen.getByRole("link", { name: /view code/i })).toHaveAttribute(
        "href",
        `https://github.com/${entry.owner}/${entry.repo}`,
      );
      cleanup();
    }
  });

  it("shows the project's name and tagline alongside the link", () => {
    const entry = FEATURED.find((f) => f.owner)!;
    openPanelFor(entry.repo);

    expect(screen.getByText(entry.name!)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view code/i })).toBeInTheDocument();
  });
});
