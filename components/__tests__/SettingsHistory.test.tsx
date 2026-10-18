/**
 * @jest-environment jsdom
 *
 * Settings change history with per-setting restore (#900).
 */

import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { SettingsHistory } from "@/components/SettingsHistory";
import { useSettingsHistoryStore } from "@/store/useSettingsHistoryStore";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { useDataSaverStore } from "@/store/useDataSaverStore";
import { useWebhookStore } from "@/store/useWebhookStore";

describe("SettingsHistory", () => {
  beforeEach(() => {
    // Reset before rendering, while no tracker is subscribed.
    useCurrencyStore.setState({ currency: "USD" });
    useDataSaverStore.setState({ dataSaverEnabled: false });
    useWebhookStore.setState({ webhooks: [] });
    useSettingsHistoryStore.setState({ entries: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows an empty state before any change", () => {
    render(<SettingsHistory />);

    expect(screen.getByTestId("settings-history-empty")).toHaveTextContent(
      /no changes recorded yet/i
    );
    expect(screen.queryByRole("button", { name: "Clear history" })).not.toBeInTheDocument();
  });

  it("records the setting, prior and current values, and change time", () => {
    render(<SettingsHistory />);

    act(() => {
      useCurrencyStore.getState().setCurrency("EUR");
    });

    const row = screen.getByRole("listitem", { name: "Display currency change" });
    expect(within(row).getByText("Display currency")).toBeInTheDocument();
    expect(within(row).getByText("Previous").nextSibling).toHaveTextContent(
      "USD (US Dollar)"
    );
    expect(within(row).getByText("Changed to").nextSibling).toHaveTextContent(
      "EUR (Euro)"
    );

    const time = row.querySelector("time");
    const { changedAt } = useSettingsHistoryStore.getState().entries[0];
    expect(time).toHaveAttribute("dateTime", changedAt);
    expect(Number.isNaN(Date.parse(changedAt))).toBe(false);
  });

  it("lists the newest change first", () => {
    render(<SettingsHistory />);

    act(() => {
      useCurrencyStore.getState().setCurrency("EUR");
      useDataSaverStore.getState().setDataSaverEnabled(true);
    });

    const rows = within(
      screen.getByRole("list", { name: "Settings change history" })
    ).getAllByRole("listitem");
    expect(rows[0]).toHaveAccessibleName("Data saver change");
    expect(rows[1]).toHaveAccessibleName("Display currency change");
  });

  it("restores a prior value and confirms it", () => {
    render(<SettingsHistory />);

    act(() => {
      useCurrencyStore.getState().setCurrency("EUR");
    });
    const sourceId = useSettingsHistoryStore.getState().entries[0].id;

    fireEvent.click(
      screen.getByRole("button", { name: "Restore Display currency to USD (US Dollar)" })
    );

    expect(useCurrencyStore.getState().currency).toBe("USD");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Display currency restored to USD (US Dollar)."
    );

    // The restore is itself recorded and linked to the source entry.
    const [latest, original] = useSettingsHistoryStore.getState().entries;
    expect(latest).toMatchObject({
      settingId: "currency",
      previous: "EUR",
      current: "USD",
      restoredFromId: sourceId,
    });
    expect(original.id).toBe(sourceId);
    expect(screen.getByText("Restored from an earlier change.")).toBeInTheDocument();

    // The original entry's prior value is now current, so it can't be re-applied.
    const originalButton = screen.getByRole("button", {
      name: "Restore Display currency to USD (US Dollar)",
    });
    expect(originalButton).toBeDisabled();
    expect(originalButton).toHaveAccessibleDescription("Already the current value.");
  });

  it("restores boolean settings", () => {
    render(<SettingsHistory />);

    act(() => {
      useDataSaverStore.getState().setDataSaverEnabled(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "Restore Data saver to Off" }));

    expect(useDataSaverStore.getState().dataSaverEnabled).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent("Data saver restored to Off.");
  });

  it("redacts sensitive values and never persists them", () => {
    render(<SettingsHistory />);

    act(() => {
      useWebhookStore
        .getState()
        .addWebhook("https://hooks.example.com/in?token=super-secret", ["new_signal"]);
    });

    const row = screen.getByRole("listitem", { name: "Webhook endpoints change" });
    expect(within(row).getAllByText("Hidden")).toHaveLength(2);
    expect(within(row).getByText("Sensitive value hidden.")).toBeInTheDocument();
    expect(row).not.toHaveTextContent("super-secret");

    const restore = within(row).getByRole("button", { name: "Restore Webhook endpoints" });
    expect(restore).toBeDisabled();
    expect(restore).toHaveAccessibleDescription(
      "Sensitive values can't be restored from history."
    );

    expect(window.localStorage.getItem("settings-history")).not.toContain("super-secret");
  });

  it("explains when a setting doesn't support restore", () => {
    useSettingsHistoryStore.setState({
      entries: [
        {
          id: "legacy-1",
          settingId: "removedSetting",
          label: "Removed setting",
          previous: "a",
          current: "b",
          changedAt: new Date().toISOString(),
          redacted: false,
        },
      ],
    });

    render(<SettingsHistory />);

    const restore = screen.getByRole("button", { name: "Restore Removed setting to a" });
    expect(restore).toBeDisabled();
    expect(restore).toHaveAccessibleDescription(
      "Restore isn't supported for this setting."
    );
  });

  it("shows a clear state when history storage is unavailable", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    render(<SettingsHistory />);

    expect(screen.getByTestId("settings-history-unavailable")).toHaveTextContent(
      "History unavailable"
    );
    expect(screen.queryByTestId("settings-history-empty")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Settings change history" })
    ).not.toBeInTheDocument();
  });

  it("clears history", () => {
    render(<SettingsHistory />);

    act(() => {
      useCurrencyStore.getState().setCurrency("GBP");
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear history" }));

    expect(useSettingsHistoryStore.getState().entries).toHaveLength(0);
    expect(screen.getByTestId("settings-history-empty")).toBeInTheDocument();
  });
});
