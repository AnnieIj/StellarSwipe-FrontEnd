/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WebhookPayloadPreview } from "@/components/WebhookPayloadPreview";

const EVENTS = [
  { value: "new_signal", label: "New Signal" },
  { value: "trade_execution", label: "Trade Execution" },
  { value: "legacy_event", label: "Legacy Event" },
];

// Plain recorder (not jest.fn/vi.fn) so the suite runs under Jest and Vitest.
let copied: string[] = [];
let copyResult: Promise<void>;
const writeText = (text: string) => {
  copied.push(text);
  return copyResult;
};

beforeEach(() => {
  copied = [];
  copyResult = Promise.resolve();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

describe("WebhookPayloadPreview", () => {
  it("shows a labeled sample payload and schema version for the selected event", () => {
    render(<WebhookPayloadPreview events={EVENTS} />);
    expect(screen.getByText(/Sample data · Schema version 1.0/)).toBeTruthy();
    expect(screen.getByLabelText("Sample webhook payload").textContent).toContain(
      '"event": "new_signal"'
    );

    fireEvent.change(screen.getByLabelText("Event type"), {
      target: { value: "trade_execution" },
    });
    expect(screen.getByLabelText("Sample webhook payload").textContent).toContain(
      '"tradeId": "trade_test_demo"'
    );
  });

  it("copies the sample payload and announces success", async () => {
    render(<WebhookPayloadPreview events={EVENTS} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy sample payload" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/copied/i)
    );
    expect(copied).toHaveLength(1);
    expect(copied[0]).toContain('"event": "new_signal"');
  });

  it("announces a copy failure", async () => {
    copyResult = Promise.reject(new Error("denied"));
    copyResult.catch(() => {});
    render(<WebhookPayloadPreview events={EVENTS} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy sample payload" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/could not copy/i)
    );
  });

  it("shows a fallback when no schema is available", () => {
    render(<WebhookPayloadPreview events={EVENTS} />);
    fireEvent.change(screen.getByLabelText("Event type"), {
      target: { value: "legacy_event" },
    });
    expect(screen.queryByLabelText("Sample webhook payload")).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(
      /No sample payload is available/
    );
  });
});
