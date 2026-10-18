/**
 * E2E tests: backtest simulation tool at /backtest-sim
 *
 * Covers: parameter entry (dates, provider selection, fee/slippage),
 * running the simulation, result panel rendering, and export button state.
 *
 * The tool uses a client-side placeholder engine (lib/backtest.ts) that
 * resolves after ~500 ms — no API routes are involved, so no route mocking
 * is needed.
 */

import { test, expect, Page } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function waitForTool(page: Page) {
  // The component is dynamically imported (ssr:false); wait for the loading
  // skeleton to disappear and the date inputs to appear.
  await expect(page.locator('input[type="date"]').first()).toBeVisible({
    timeout: 10_000,
  });
}

async function navigateToBacktest(page: Page) {
  await page.goto("/backtest-sim");
  await expect(
    page.getByRole("heading", { name: /signal backtesting simulation/i })
  ).toBeVisible({
    timeout: 10_000,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Backtest simulation tool", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToBacktest(page);
    await waitForTool(page);
  });

  // ── Page structure ───────────────────────────────────────────────────────

  test("renders the page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /signal backtesting simulation/i })
    ).toBeVisible();
  });

  test("renders the From and To date inputs with default values", async ({
    page,
  }) => {
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);

    const fromValue = await dateInputs.nth(0).inputValue();
    const toValue = await dateInputs.nth(1).inputValue();
    expect(fromValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("renders the provider/signal multi-select with four options", async ({
    page,
  }) => {
    const select = page.locator("select[multiple]");
    await expect(select).toBeVisible();

    const options = select.locator("option");
    await expect(options).toHaveCount(4);

    const values = await options.allTextContents();
    expect(values).toContain("Provider A");
    expect(values).toContain("Provider B");
  });

  test("renders slippage and fee numeric inputs", async ({ page }) => {
    const numericInputs = page.locator('input[type="number"]');
    await expect(numericInputs).toHaveCount(2);
  });

  test('"Run Simulation" button is visible and enabled before any run', async ({
    page,
  }) => {
    const btn = page.getByRole("button", { name: /run simulation/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test("Export CSV and Export JSON buttons are disabled before running", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /export csv/i })
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /export json/i })
    ).toBeDisabled();
  });

  test("shows placeholder text before the first simulation run", async ({
    page,
  }) => {
    await expect(
      page.getByText(/simulated results.*will appear here/i)
    ).toBeVisible();
  });

  // ── Parameter entry ──────────────────────────────────────────────────────

  test("accepts custom date range input", async ({ page }) => {
    const [fromInput, toInput] = await page.locator('input[type="date"]').all();
    await fromInput.fill("2022-01-01");
    await toInput.fill("2022-12-31");

    expect(await fromInput.inputValue()).toBe("2022-01-01");
    expect(await toInput.inputValue()).toBe("2022-12-31");
  });

  test("accepts slippage and fee bps input", async ({ page }) => {
    const [slippageInput, feeInput] = await page
      .locator('input[type="number"]')
      .all();
    await slippageInput.fill("25");
    await feeInput.fill("5");

    expect(await slippageInput.inputValue()).toBe("25");
    expect(await feeInput.inputValue()).toBe("5");
  });

  test("allows selecting a provider from the multi-select", async ({
    page,
  }) => {
    const select = page.locator("select[multiple]");
    await select.selectOption("providerA");

    const selectedValues = await select.evaluate((el: HTMLSelectElement) =>
      Array.from(el.selectedOptions).map((o) => o.value)
    );
    expect(selectedValues).toContain("providerA");
  });

  // ── Simulation run ───────────────────────────────────────────────────────

  test("shows loading state while the simulation is running", async ({
    page,
  }) => {
    const btn = page.getByRole("button", { name: /run simulation/i });
    await btn.click();

    // The button label briefly shows "Running…" during the 500 ms placeholder delay
    await expect(page.getByRole("button", { name: /running/i })).toBeVisible({
      timeout: 2_000,
    });
  });

  test("renders result cards after running simulation", async ({ page }) => {
    await page.getByRole("button", { name: /run simulation/i }).click();

    await expect(page.getByText(/total return/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(/win rate/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/max drawdown/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("result cards display percentage values", async ({ page }) => {
    await page.getByRole("button", { name: /run simulation/i }).click();
    await expect(page.getByText(/total return/i)).toBeVisible({
      timeout: 5_000,
    });

    // The placeholder engine returns 0, so metrics show "0.00%" or "0.0%"
    await expect(page.getByText(/0\.\d+%/).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("Export CSV and Export JSON buttons become enabled after a run", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /run simulation/i }).click();
    await expect(page.getByText(/total return/i)).toBeVisible({
      timeout: 5_000,
    });

    await expect(
      page.getByRole("button", { name: /export csv/i })
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: /export json/i })
    ).toBeEnabled();
  });

  test("Run Simulation re-enables after the first run", async ({ page }) => {
    await page.getByRole("button", { name: /run simulation/i }).click();
    await expect(page.getByText(/total return/i)).toBeVisible({
      timeout: 5_000,
    });

    await expect(
      page.getByRole("button", { name: /run simulation/i })
    ).toBeEnabled();
  });

  // ── Re-run with changed parameters ───────────────────────────────────────

  test("can run a second simulation after changing the date range", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /run simulation/i }).click();
    await expect(page.getByText(/total return/i)).toBeVisible({
      timeout: 5_000,
    });

    const [fromInput] = await page.locator('input[type="date"]').all();
    await fromInput.fill("2021-06-01");

    await page.getByRole("button", { name: /run simulation/i }).click();
    // Results panel should still be visible after the second run
    await expect(page.getByText(/total return/i)).toBeVisible({
      timeout: 5_000,
    });
  });
});
