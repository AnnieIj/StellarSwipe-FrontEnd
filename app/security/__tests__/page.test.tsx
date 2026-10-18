/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import SecuritySettingsPage from "../page";

jest.mock("@/content/security", () => ({
  bugBountyProgram: {
    title: "Responsible Disclosure",
    summary: "Security researchers can report vulnerabilities.",
    scope: ["Scope item"],
    rewardTiers: [
      {
        severity: "Critical",
        description: "Critical risk impact.",
      },
    ],
    submissionSteps: ["Step one."],
    contact: {
      label: "Submit a private vulnerability report",
      href: "https://github.com/mock",
    },
  },
}));

jest.mock("@/content/audits", () => ({
  auditReports: [
    {
      id: "audit-old",
      auditor: "Old Auditor",
      date: "2025-01-01",
      scope: "Old Scope",
      link: "https://github.com/old",
    },
    {
      id: "audit-new",
      auditor: "New Auditor",
      date: "2025-02-01",
      scope: "New Scope",
      link: "https://github.com/new",
    },
  ],
}));

import { bugBountyProgram } from "@/content/security";

describe("SecuritySettingsPage", () => {
  it("renders the public bug-bounty program section", () => {
    render(<SecuritySettingsPage />);

    expect(
      screen.getByRole("heading", { name: bugBountyProgram.title })
    ).toBeTruthy();
    expect(screen.getByText(bugBountyProgram.summary)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: bugBountyProgram.contact.label })
        .getAttribute("href")
    ).toBe(bugBountyProgram.contact.href);

    for (const scopeItem of bugBountyProgram.scope) {
      expect(screen.getByText(scopeItem)).toBeTruthy();
    }

    for (const tier of bugBountyProgram.rewardTiers) {
      expect(screen.getByText(tier.severity)).toBeTruthy();
      expect(screen.getByText(tier.description)).toBeTruthy();
    }
  });

  it("renders the smart-contract audit reports from a mocked content source in descending date order", () => {
    render(<SecuritySettingsPage />);

    expect(
      screen.getByRole("heading", { name: "Smart-Contract Audit Reports" })
    ).toBeTruthy();

    expect(screen.getByText("Old Auditor")).toBeTruthy();
    expect(screen.getByText("Scope: Old Scope")).toBeTruthy();
    expect(screen.getByText("2025-01-01")).toBeTruthy();

    expect(screen.getByText("New Auditor")).toBeTruthy();
    expect(screen.getByText("Scope: New Scope")).toBeTruthy();
    expect(screen.getByText("2025-02-01")).toBeTruthy();

    const links = screen.getAllByRole("link", { name: /view report/i });
    expect(links.length).toBe(2);

    expect(links[0].getAttribute("href")).toBe("https://github.com/new");
    expect(links[1].getAttribute("href")).toBe("https://github.com/old");

    const textContent = document.body.textContent || "";
    const newIdx = textContent.indexOf("New Auditor");
    const oldIdx = textContent.indexOf("Old Auditor");
    expect(newIdx).toBeLessThan(oldIdx);
  });
});
