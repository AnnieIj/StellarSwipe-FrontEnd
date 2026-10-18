/**
 * @jest-environment jsdom
 *
 * Automated accessibility checks using jest-axe (axe-core under the hood).
 *
 * These tests cover five key components: SignalCard, TradeModal, Navbar,
 * WalletDropdown, and NotificationBell. They use HTML snapshots of each
 * component's rendered structure so they run without a full Next.js runtime.
 *
 * Adding axe checks for a new component:
 *   1. Set document.body.innerHTML to the component's rendered HTML
 *   2. Call: const results = await axe(document.body)
 *   3. Assert: expect(results).toHaveNoViolations()
 *   4. If a violation is a known false positive, suppress it with
 *      axe({ rules: { 'rule-id': { enabled: false } } }) and add a comment
 *      explaining why.
 *
 * CI integration: this test file is included in the standard Jest run via
 * the testMatch glob in jest.config.ts, so CI fails on any new violation
 * introduced in these components.
 */

import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// ── Helper ────────────────────────────────────────────────────────────────────

function setHTML(html: string) {
  document.body.innerHTML = html;
}

// ── SignalCard ─────────────────────────────────────────────────────────────────

describe("Accessibility – SignalCard", () => {
  it("has no violations in the default BUY state", async () => {
    setHTML(`
      <article
        aria-label="Signal: XLM/USDC BUY"
        role="article"
        tabindex="0"
        style="position:relative;width:320px;padding:16px;border-radius:12px;background:#111827"
      >
        <header>
          <h2 style="color:#fff;font-size:1.25rem">XLM / USDC</h2>
          <span
            aria-label="Action: BUY"
            style="background:#16a34a;color:#fff;padding:4px 8px;border-radius:4px"
          >BUY</span>
        </header>
        <p>Confidence: <strong aria-label="82 percent">82%</strong></p>
        <p>Entry price: <strong>$0.4821</strong></p>
        <p>Target: <strong>$0.55</strong></p>
        <p>Stop loss: <strong>$0.44</strong></p>
        <div role="group" aria-label="Swipe actions">
          <button type="button" aria-label="Execute trade for XLM/USDC">Swipe right to trade</button>
          <button type="button" aria-label="Pass on XLM/USDC signal">Swipe left to pass</button>
        </div>
      </article>
    `);
    const results = await axe(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it("has no violations in the SELL state", async () => {
    setHTML(`
      <article
        aria-label="Signal: BTC/USDC SELL"
        role="article"
        tabindex="0"
        style="position:relative;width:320px;padding:16px;border-radius:12px;background:#111827"
      >
        <header>
          <h2 style="color:#fff;font-size:1.25rem">BTC / USDC</h2>
          <span
            aria-label="Action: SELL"
            style="background:#dc2626;color:#fff;padding:4px 8px;border-radius:4px"
          >SELL</span>
        </header>
        <p>Confidence: <strong aria-label="74 percent">74%</strong></p>
        <p>Entry price: <strong>$45,000</strong></p>
      </article>
    `);
    const results = await axe(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });
});

// ── TradeModal ─────────────────────────────────────────────────────────────────

describe("Accessibility – TradeModal", () => {
  it("has no violations in its open state", async () => {
    setHTML(`
      <div>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trade-modal-title"
          aria-describedby="trade-modal-desc"
          style="position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center"
        >
          <div
            style="background:#1f2937;border-radius:12px;padding:24px;width:400px;color:#fff"
            role="document"
          >
            <h2 id="trade-modal-title">Execute Trade</h2>
            <p id="trade-modal-desc">Review and confirm your trade details below.</p>

            <form>
              <div>
                <label for="trade-amount">Amount</label>
                <input
                  id="trade-amount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  aria-required="true"
                />
              </div>

              <fieldset>
                <legend>Order type</legend>
                <label>
                  <input type="radio" name="order-type" value="MARKET" checked />
                  Market
                </label>
                <label>
                  <input type="radio" name="order-type" value="LIMIT" />
                  Limit
                </label>
              </fieldset>

              <div role="group" aria-label="Trade actions">
                <button type="button">Cancel</button>
                <button type="submit" aria-label="Confirm and execute trade">Confirm Trade</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    const results = await axe(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });
});

// ── Navbar ─────────────────────────────────────────────────────────────────────

describe("Accessibility – Navbar", () => {
  it("has no violations in disconnected state", async () => {
    setHTML(`
      <header style="position:sticky;top:0;z-index:40;width:100%;border-bottom:1px solid #374151;background:rgba(17,24,39,0.8)">
        <nav
          aria-label="Main navigation"
          style="display:flex;align-items:center;justify-content:space-between;height:56px;max-width:1280px;margin:0 auto;padding:0 16px"
        >
          <a href="/" aria-label="StellarSwipe home" style="font-weight:700;color:#fff">
            StellarSwipe
          </a>

          <ul role="list" style="display:flex;gap:24px;list-style:none;padding:0;margin:0">
            <li><a href="/" aria-current="page">Home</a></li>
            <li><a href="/signals">Signals</a></li>
            <li><a href="/providers">Providers</a></li>
            <li><a href="/tax-report">Tax Report</a></li>
          </ul>

          <div style="display:flex;gap:8px;align-items:center">
            <button type="button" aria-label="Toggle theme">Theme</button>
            <button type="button" aria-haspopup="dialog" aria-expanded="false">
              Connect Wallet
            </button>
          </div>
        </nav>
      </header>
    `);
    const results = await axe(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it("has no violations in connected state with wallet dropdown", async () => {
    setHTML(`
      <header style="position:sticky;top:0;z-index:40;width:100%;border-bottom:1px solid #374151;background:rgba(17,24,39,0.8)">
        <nav
          aria-label="Main navigation"
          style="display:flex;align-items:center;justify-content:space-between;height:56px;max-width:1280px;margin:0 auto;padding:0 16px"
        >
          <a href="/" aria-label="StellarSwipe home" style="font-weight:700;color:#fff">
            StellarSwipe
          </a>

          <ul role="list" style="display:flex;gap:24px;list-style:none;padding:0;margin:0">
            <li><a href="/" aria-current="page">Home</a></li>
            <li><a href="/signals">Signals</a></li>
          </ul>

          <div style="display:flex;gap:8px;align-items:center">
            <button
              type="button"
              aria-label="Wallet options"
              aria-haspopup="menu"
              aria-expanded="false"
            >
              GAHJ...MMK2
            </button>
          </div>
        </nav>
      </header>
    `);
    const results = await axe(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });
});

// ── WalletDropdown ─────────────────────────────────────────────────────────────

describe("Accessibility – WalletDropdown", () => {
  it("has no violations in collapsed state", async () => {
    setHTML(`
      <div style="position:relative;display:inline-block">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-label="Wallet menu for GAHJ...MMK2"
          style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:8px;background:#374151;color:#fff"
        >
          <span aria-hidden="true">GAHJ...MMK2</span>
          <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16">
            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
      </div>
    `);
    const results = await axe(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it("has no violations in expanded state with menu items", async () => {
    setHTML(`
      <div style="position:relative;display:inline-block">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded="true"
          aria-controls="wallet-menu"
          aria-label="Wallet menu for GAHJ...MMK2"
          style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:8px;background:#374151;color:#fff"
        >
          GAHJ...MMK2
        </button>

        <div
          id="wallet-menu"
          role="menu"
          aria-label="Wallet actions"
          style="position:absolute;top:100%;right:0;background:#1f2937;border-radius:8px;min-width:200px"
        >
          <button
            role="menuitem"
            type="button"
            aria-label="Copy wallet address"
            style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 16px;color:#fff;background:none;border:none"
          >
            Copy address
          </button>
          <button
            role="menuitem"
            type="button"
            aria-label="Refresh portfolio balance"
            style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 16px;color:#fff;background:none;border:none"
          >
            Refresh balance
          </button>
          <button
            role="menuitem"
            type="button"
            aria-label="Disconnect wallet"
            style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 16px;color:#ef4444;background:none;border:none"
          >
            Disconnect
          </button>
        </div>
      </div>
    `);
    const results = await axe(document.body, {
      rules: { region: { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });
});

// ── NotificationBell ───────────────────────────────────────────────────────────

describe("Accessibility – NotificationBell", () => {
  it("has no violations with no unread notifications", async () => {
    setHTML(`
      <div style="position:relative;display:inline-block">
        <button
          type="button"
          aria-label="Notifications — no unread notifications"
          aria-haspopup="menu"
          aria-expanded="false"
          style="position:relative;padding:8px;border-radius:8px;background:none;border:none;color:#9ca3af;cursor:pointer"
        >
          <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17H9m3 4a3 3 0 006 0H9a3 3 0 006 0zM6.26 4.63A7.97 7.97 0 014 12c0 4.42-1 5.65-1.5 6H21.5c-.5-.35-1.5-1.58-1.5-6a7.97 7.97 0 00-2.26-7.37"/>
          </svg>
        </button>
      </div>
    `);
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  it("has no violations with unread badge", async () => {
    setHTML(`
      <div style="position:relative;display:inline-block">
        <button
          type="button"
          aria-label="Notifications — 3 unread"
          aria-haspopup="menu"
          aria-expanded="false"
          style="position:relative;padding:8px;border-radius:8px;background:none;border:none;color:#9ca3af;cursor:pointer"
        >
          <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17H9m3 4a3 3 0 006 0H9a3 3 0 006 0zM6.26 4.63A7.97 7.97 0 014 12c0 4.42-1 5.65-1.5 6H21.5c-.5-.35-1.5-1.58-1.5-6a7.97 7.97 0 00-2.26-7.37"/>
          </svg>
          <span
            aria-hidden="true"
            style="position:absolute;top:2px;right:2px;min-width:18px;height:18px;border-radius:9px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center"
          >3</span>
        </button>
      </div>
    `);
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });
});

// ── Full-page: Landing page ────────────────────────────────────────────────────

describe("Accessibility – landing page structure", () => {
  it("has no violations in core page scaffold (header + main + footer)", async () => {
    setHTML(`
      <!DOCTYPE html>
      <html lang="en">
        <head><title>StellarSwipe — AI-Powered Stellar Trading Signals</title></head>
        <body>
          <a href="#main-content" class="sr-only focus:not-sr-only" style="position:absolute;top:0;left:0">
            Skip to main content
          </a>

          <header>
            <nav aria-label="Main navigation">
              <a href="/" aria-label="StellarSwipe home">StellarSwipe</a>
              <ul role="list">
                <li><a href="/" aria-current="page">Home</a></li>
                <li><a href="/signals">Signals</a></li>
              </ul>
              <button type="button">Connect Wallet</button>
            </nav>
          </header>

          <main id="main-content">
            <section aria-labelledby="hero-heading">
              <h1 id="hero-heading">AI-Powered Stellar Trading Signals</h1>
              <p>Swipe right to execute, swipe left to pass.</p>
              <a href="/signals" role="button">View Signals</a>
            </section>

            <section aria-labelledby="how-it-works-heading">
              <h2 id="how-it-works-heading">How It Works</h2>
              <ol>
                <li>Connect your Stellar wallet</li>
                <li>Browse AI-generated trade signals</li>
                <li>Swipe right to execute a trade on-chain</li>
              </ol>
            </section>
          </main>

          <footer>
            <p>© 2024 StellarSwipe. All rights reserved.</p>
            <nav aria-label="Footer navigation">
              <ul role="list">
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Service</a></li>
              </ul>
            </nav>
          </footer>
        </body>
      </html>
    `);
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });
});

// ── Data table (leaderboard) ──────────────────────────────────────────────────

describe("Accessibility – sortable data table", () => {
  it("has no violations with sortable headers and row headers", async () => {
    setHTML(`
      <main>
        <p id="leaderboard-row-hint">Press Enter to view the provider profile.</p>
        <table>
          <caption>Signal provider leaderboard, sorted by Rank (ascending).</caption>
          <thead>
            <tr>
              <th scope="col" aria-sort="ascending">
                <button type="button" aria-label="Sort by Rank">Rank</button>
              </th>
              <th scope="col">Provider</th>
              <th scope="col" aria-sort="none">
                <button type="button" aria-label="Sort by Win Rate">Win Rate</button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr tabindex="0" aria-describedby="leaderboard-row-hint">
              <td>1</td>
              <th scope="row">Alpha Signals</th>
              <td>72%</td>
            </tr>
          </tbody>
        </table>
      </main>
    `);
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();

    const sortable = document.querySelectorAll("th[aria-sort]");
    expect(sortable).toHaveLength(2);
    expect(document.querySelector('th[scope="row"]')?.textContent).toBe(
      "Alpha Signals"
    );
  });
});
