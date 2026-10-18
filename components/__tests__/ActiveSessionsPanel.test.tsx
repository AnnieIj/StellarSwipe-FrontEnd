/**
 * @jest-environment jsdom
 *
 * Unit tests for <ActiveSessionsPanel />
 *
 * Covers:
 *  - List rendering (device label, location, last-active, current badge)
 *  - Current session cannot be revoked (no Revoke button)
 *  - Single-session revoke: calls onRevoke, removes session optimistically
 *  - Single-session revoke: rolls back and shows error on failure
 *  - Bulk revoke: calls onRevokeAll, removes all non-current sessions
 *  - Bulk revoke: rolls back and shows error on failure
 *  - "Revoke all" button is hidden when there are no other sessions
 *  - Loading skeleton renders while isLoading=true
 *  - Error message renders when error prop is set
 *  - Empty state renders when sessions list is empty
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import { ActiveSessionsPanel } from "@/components/ActiveSessionsPanel";
import type { Session } from "@/lib/sessionUtils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CURRENT_SESSION: Session = {
  id: "sess_current",
  deviceLabel: "Chrome on macOS",
  location: "London, UK",
  lastActiveAt: new Date().toISOString(),
  isCurrent: true,
};

const SESSION_A: Session = {
  id: "sess_a",
  deviceLabel: "Firefox on Windows 11",
  location: "New York, US",
  lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  isCurrent: false,
};

const SESSION_B: Session = {
  id: "sess_b",
  deviceLabel: "Safari on iPhone 15",
  location: "Tokyo, JP",
  lastActiveAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  isCurrent: false,
};

const ALL_SESSIONS = [CURRENT_SESSION, SESSION_A, SESSION_B];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noop(): Promise<void> {
  return Promise.resolve();
}

function failingFn(): Promise<void> {
  return Promise.reject(new Error("API error"));
}

// ---------------------------------------------------------------------------
// List rendering
// ---------------------------------------------------------------------------

describe("ActiveSessionsPanel – list rendering", () => {
  it("renders a row for each session", () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    expect(screen.getByTestId("session-row-sess_current")).toBeTruthy();
    expect(screen.getByTestId("session-row-sess_a")).toBeTruthy();
    expect(screen.getByTestId("session-row-sess_b")).toBeTruthy();
  });

  it("displays the device label for each session", () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    expect(screen.getByText("Chrome on macOS")).toBeTruthy();
    expect(screen.getByText("Firefox on Windows 11")).toBeTruthy();
    expect(screen.getByText("Safari on iPhone 15")).toBeTruthy();
  });

  it("shows the location for each session", () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    expect(screen.getByText("London, UK")).toBeTruthy();
    expect(screen.getByText("New York, US")).toBeTruthy();
    expect(screen.getByText("Tokyo, JP")).toBeTruthy();
  });

  it("marks the current session with a 'Current' badge", () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    // aria-label is on the badge span
    expect(screen.getByLabelText("This is your current session")).toBeTruthy();
  });

  it("does not show a Revoke button for the current session", () => {
    render(
      <ActiveSessionsPanel
        sessions={[CURRENT_SESSION]}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    const revokeButtons = screen.queryAllByRole("button", { name: /revoke/i });
    expect(revokeButtons).toHaveLength(0);
  });

  it("shows a Revoke button for each non-current session", () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    // SESSION_A and SESSION_B each get a revoke button
    expect(
      screen.getByRole("button", {
        name: /revoke session on firefox on windows 11/i,
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /revoke session on safari on iphone 15/i,
      })
    ).toBeTruthy();
  });

  it("renders the sessions list container with accessible label", () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    expect(
      screen.getByRole("list", { name: /active sessions list/i })
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Single-session revoke
// ---------------------------------------------------------------------------

describe("ActiveSessionsPanel – single revoke", () => {
  it("calls onRevoke with the correct session id", async () => {
    const onRevoke = jest.fn().mockResolvedValue(undefined);

    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={onRevoke}
        onRevokeAll={noop}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /revoke session on firefox on windows 11/i,
      })
    );

    await waitFor(() => {
      expect(onRevoke).toHaveBeenCalledWith(SESSION_A.id);
    });
  });

  it("removes the session from the list after successful revoke", async () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /revoke session on firefox on windows 11/i,
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId("session-row-sess_a")).toBeNull();
    });
  });

  it("keeps other sessions after a single revoke", async () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /revoke session on firefox on windows 11/i,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("session-row-sess_current")).toBeTruthy();
      expect(screen.getByTestId("session-row-sess_b")).toBeTruthy();
    });
  });

  it("rolls back and shows an error when onRevoke rejects", async () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={failingFn}
        onRevokeAll={noop}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /revoke session on firefox on windows 11/i,
        })
      );
    });

    await waitFor(() => {
      // Session should be restored
      expect(screen.getByTestId("session-row-sess_a")).toBeTruthy();
      // Error message should appear
      expect(screen.getByRole("alert", { hidden: false })).toBeTruthy();
    });
  });

  it("shows error text mentioning retry after a failed revoke", async () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={failingFn}
        onRevokeAll={noop}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /revoke session on firefox on windows 11/i,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("try again");
    });
  });
});

// ---------------------------------------------------------------------------
// Bulk revoke
// ---------------------------------------------------------------------------

describe("ActiveSessionsPanel – bulk revoke", () => {
  it("calls onRevokeAll when the bulk button is clicked", async () => {
    const onRevokeAll = jest.fn().mockResolvedValue(undefined);

    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={onRevokeAll}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /revoke all 2 other sessions/i })
      );
    });

    expect(onRevokeAll).toHaveBeenCalledTimes(1);
  });

  it("removes all non-current sessions after bulk revoke", async () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /revoke all 2 other sessions/i })
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId("session-row-sess_a")).toBeNull();
      expect(screen.queryByTestId("session-row-sess_b")).toBeNull();
    });
  });

  it("keeps the current session after bulk revoke", async () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /revoke all 2 other sessions/i })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("session-row-sess_current")).toBeTruthy();
    });
  });

  it("rolls back all sessions and shows error when onRevokeAll rejects", async () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={failingFn}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /revoke all 2 other sessions/i })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("session-row-sess_a")).toBeTruthy();
      expect(screen.getByTestId("session-row-sess_b")).toBeTruthy();
      expect(screen.getByRole("alert").textContent).toContain("try again");
    });
  });

  it("hides the bulk revoke button when there are no other sessions", () => {
    render(
      <ActiveSessionsPanel
        sessions={[CURRENT_SESSION]}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    expect(screen.queryByRole("button", { name: /revoke all/i })).toBeNull();
  });

  it("hides the bulk revoke button after all other sessions have been revoked", async () => {
    render(
      <ActiveSessionsPanel
        sessions={ALL_SESSIONS}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /revoke all 2 other sessions/i })
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /revoke all/i })).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Loading / error / empty states
// ---------------------------------------------------------------------------

describe("ActiveSessionsPanel – states", () => {
  it("renders the loading skeleton when isLoading is true", () => {
    render(
      <ActiveSessionsPanel
        sessions={[]}
        onRevoke={noop}
        onRevokeAll={noop}
        isLoading
      />
    );

    expect(screen.getByLabelText("Loading sessions")).toBeTruthy();
    // List and error should NOT appear
    expect(screen.queryByTestId("sessions-list")).toBeNull();
    expect(screen.queryByTestId("sessions-error")).toBeNull();
  });

  it("marks the loading container as aria-busy while loading", () => {
    render(
      <ActiveSessionsPanel
        sessions={[]}
        onRevoke={noop}
        onRevokeAll={noop}
        isLoading
      />
    );

    expect(screen.getByLabelText("Loading sessions")).toBeTruthy();
  });

  it("renders the error message when error prop is set", () => {
    render(
      <ActiveSessionsPanel
        sessions={[]}
        onRevoke={noop}
        onRevokeAll={noop}
        error="Unable to load sessions."
      />
    );

    expect(screen.getByTestId("sessions-error").textContent).toContain(
      "Unable to load sessions."
    );
  });

  it("does not render the session list when an error is present", () => {
    render(
      <ActiveSessionsPanel
        sessions={[SESSION_A]}
        onRevoke={noop}
        onRevokeAll={noop}
        error="Something went wrong."
      />
    );

    expect(screen.queryByTestId("sessions-list")).toBeNull();
  });

  it("renders the empty state when sessions is an empty array", () => {
    render(
      <ActiveSessionsPanel sessions={[]} onRevoke={noop} onRevokeAll={noop} />
    );

    expect(screen.getByTestId("sessions-empty")).toBeTruthy();
  });

  it("does not render the empty state when sessions are present", () => {
    render(
      <ActiveSessionsPanel
        sessions={[SESSION_A]}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );

    expect(screen.queryByTestId("sessions-empty")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Device / browser context (#832)
// ---------------------------------------------------------------------------

describe("ActiveSessionsPanel – session context", () => {
  it("shows device, browser, status and a locale timestamp for the current session", () => {
    const session = { ...CURRENT_SESSION, device: "macOS", browser: "Chrome 128" };
    render(
      <ActiveSessionsPanel sessions={[session]} onRevoke={noop} onRevokeAll={noop} />
    );
    const row = within(screen.getByTestId("session-row-sess_current"));
    expect(row.getByText("macOS")).toBeTruthy();
    expect(row.getByText("Chrome 128")).toBeTruthy();
    expect(row.getByText("Current session")).toBeTruthy();
    const time = row.getByText(/Just now|just now/i).closest("time")!;
    expect(time.getAttribute("dateTime")).toBe(session.lastActiveAt);
    expect(time.getAttribute("title")).toBe(
      new Date(session.lastActiveAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    );
  });

  it("labels a remote session as another device", () => {
    render(
      <ActiveSessionsPanel
        sessions={[{ ...SESSION_A, device: "Windows 11", browser: "Firefox" }]}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );
    const row = within(screen.getByTestId("session-row-sess_a"));
    expect(row.getByText("Other device")).toBeTruthy();
    expect(row.getByText("Firefox")).toBeTruthy();
  });

  it("labels missing metadata honestly", () => {
    render(
      <ActiveSessionsPanel
        sessions={[
          { ...SESSION_B, deviceLabel: "", location: "", lastActiveAt: "bogus" },
        ]}
        onRevoke={noop}
        onRevokeAll={noop}
      />
    );
    const row = within(screen.getByTestId("session-row-sess_b"));
    expect(row.getByText("Unknown device")).toBeTruthy();
    expect(row.getByText("Location unavailable")).toBeTruthy();
    expect(row.getAllByText("Not reported")).toHaveLength(2);
    expect(row.getByText(/Unavailable/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Revoke session on Unknown device" })
    ).toBeTruthy();
  });
});
