/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { AccountActivityList } from "@/components/AccountActivityList";
import type { AccountActivity } from "@/lib/sessionUtils";

const ACTIVITY: AccountActivity[] = [
  {
    id: "a1",
    description: "Signed in",
    occurredAt: "2026-09-01T10:00:00Z",
    device: "Chrome on macOS",
    location: "London, UK",
  },
  { id: "a2", description: "Session revoked", occurredAt: "2026-08-31T08:00:00Z" },
];

describe("AccountActivityList", () => {
  it("renders available events with descriptions and locale timestamps", () => {
    render(<AccountActivityList activity={ACTIVITY} />);
    expect(screen.getByRole("region", { name: "Recent account activity" })).toBeTruthy();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("Signed in");
    expect(items[0].textContent).toContain("Chrome on macOS · London, UK");
    const time = items[0].querySelector("time")!;
    expect(time.getAttribute("dateTime")).toBe("2026-09-01T10:00:00Z");
    expect(time.textContent).toBe(
      new Date("2026-09-01T10:00:00Z").toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    );
  });

  it("does not invent device or location details that were not provided", () => {
    render(<AccountActivityList activity={ACTIVITY} />);
    const second = screen.getAllByRole("listitem")[1];
    expect(second.textContent).toContain("Session revoked");
    expect(second.textContent).not.toContain("·");
  });

  it("labels unavailable history", () => {
    render(<AccountActivityList activity={null} />);
    expect(screen.getByTestId("activity-unavailable").textContent).toMatch(/unavailable/);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("labels an empty history", () => {
    render(<AccountActivityList activity={[]} />);
    expect(screen.getByTestId("activity-empty").textContent).toMatch(/No recent/);
  });
});
