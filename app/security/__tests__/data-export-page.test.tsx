import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DataExportRequestPage from "../data-export/page";

describe("DataExportRequestPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("shows an empty state when there is no export request", () => {
    render(<DataExportRequestPage />);

    expect(screen.getByText("No export requests yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /request full account export/i })
    ).toBeEnabled();
  });

  it("shows a pending state after requesting an export", () => {
    render(<DataExportRequestPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /request full account export/i })
    );

    expect(screen.getByText(/received and will be processed/i)).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /request full account export/i })
    ).toBeDisabled();
  });

  it("shows a ready state and a download link after the request completes", () => {
    render(<DataExportRequestPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /request full account export/i })
    );

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getAllByText(/your export is ready/i).length).toBeGreaterThan(0);
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /download account data export/i })
    ).toHaveAttribute("href", expect.stringContaining("data:application/json"));
  });

  it("rate-limits repeat requests while one is still pending", () => {
    render(<DataExportRequestPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /request full account export/i })
    );

    fireEvent.click(
      screen.getByRole("button", { name: /request full account export/i })
    );

    expect(screen.getAllByText("pending")).toHaveLength(1);
    expect(
      screen.getByText(/another export request is already being prepared/i)
    ).toBeInTheDocument();
  });
});
