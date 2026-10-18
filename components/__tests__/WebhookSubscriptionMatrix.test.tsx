/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WebhookSubscriptionMatrix } from "@/components/WebhookSubscriptionMatrix";
import type { Webhook, WebhookEventType } from "@/store/useWebhookStore";

const EVENTS: { value: WebhookEventType; label: string }[] = [
  { value: "new_signal", label: "New Signal" },
  { value: "trade_execution", label: "Trade Execution" },
];

const hook = (id: string, url: string, events: WebhookEventType[]): Webhook => ({
  id,
  url,
  events,
  secret: "secret",
  createdAt: "2026-01-01T00:00:00Z",
  deliveries: [],
  rateLimit: 60,
  maxRetries: 3,
  backoffInterval: 1000,
});

const WEBHOOKS = [
  hook("a", "https://a.test/hook", ["new_signal"]),
  hook("b", "https://b.test/hook", []),
];

// Plain recorder (not jest.fn/vi.fn) so the suite runs under Jest and Vitest.
function recorder(impl: () => Promise<void> | void = () => {}) {
  const calls: [string, WebhookEventType[]][] = [];
  const fn = (id: string, events: WebhookEventType[]) => {
    calls.push([id, events]);
    return impl();
  };
  return { fn, calls };
}

describe("WebhookSubscriptionMatrix", () => {
  it("renders an accessible checkbox per endpoint and event with current state", () => {
    render(
      <WebhookSubscriptionMatrix webhooks={WEBHOOKS} events={EVENTS} onUpdate={recorder().fn} />
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    const a = screen.getByLabelText("New Signal events for https://a.test/hook") as HTMLInputElement;
    const b = screen.getByLabelText("Trade Execution events for https://b.test/hook") as HTMLInputElement;
    expect(a.checked).toBe(true);
    expect(b.checked).toBe(false);
  });

  it("shows pending then saved state when an update succeeds", async () => {
    let resolve!: () => void;
    const onUpdate = recorder(() => new Promise<void>((r) => (resolve = r)));
    render(
      <WebhookSubscriptionMatrix webhooks={WEBHOOKS} events={EVENTS} onUpdate={onUpdate.fn} />
    );
    const box = screen.getByLabelText("Trade Execution events for https://a.test/hook");
    fireEvent.click(box);
    expect(onUpdate.calls).toEqual([["a", ["new_signal", "trade_execution"]]]);
    expect(screen.getByText("Saving…")).toBeTruthy();
    expect((box as HTMLInputElement).disabled).toBe(true);
    resolve();
    await waitFor(() => expect(screen.getByText("Saved")).toBeTruthy());
  });

  it("shows failure feedback when an update fails", async () => {
    const onUpdate = recorder(() => Promise.reject(new Error("boom")));
    render(
      <WebhookSubscriptionMatrix webhooks={WEBHOOKS} events={EVENTS} onUpdate={onUpdate.fn} />
    );
    fireEvent.click(screen.getByLabelText("New Signal events for https://a.test/hook"));
    expect(onUpdate.calls).toEqual([["a", []]]);
    await waitFor(() => expect(screen.getByText("Failed")).toBeTruthy());
    expect(screen.getByRole("alert").textContent).toMatch(/could not be saved/);
  });
});
