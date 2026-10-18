/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PnLShareCardGenerator } from "@/components/analytics/PnLShareCardGenerator";

// jsdom does not implement 2D canvas rendering. Replace getContext with a
// stub that records every fillText call so we can assert on what actually
// gets drawn onto the generated card, without needing real canvas support.
class MockContext2D {
  fillStyle = "";
  strokeStyle = "";
  lineWidth = 0;
  font = "";
  calls: string[] = [];
  createLinearGradient() {
    return { addColorStop: jest.fn() };
  }
  fillRect() {}
  beginPath() {}
  arc() {}
  fill() {}
  stroke() {}
  moveTo() {}
  lineTo() {}
  roundRect() {}
  fillText(text: string) {
    this.calls.push(text);
  }
}

let mockCtx: MockContext2D;

beforeEach(() => {
  mockCtx = new MockContext2D();
  jest
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(() => mockCtx as unknown as CanvasRenderingContext2D);
  jest
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockReturnValue("data:image/png;base64,mock");
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function generateCard() {
  await userEvent.click(
    screen.getByRole("button", { name: /generate card preview/i })
  );
}

describe("PnLShareCardGenerator – card generation", () => {
  it("shows a placeholder until a card is generated", () => {
    render(<PnLShareCardGenerator />);
    expect(
      screen.getByText(/preview appears here after generating/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByAltText(/preview of generated p&l share card/i)
    ).not.toBeInTheDocument();
  });

  it("renders a preview image after generating with the default stat selection", async () => {
    render(<PnLShareCardGenerator />);
    await generateCard();

    expect(
      screen.getByAltText(/preview of generated p&l share card/i)
    ).toBeInTheDocument();
    expect(mockCtx.calls).toEqual(
      expect.arrayContaining(["PERIOD P&L", "WIN RATE"])
    );
    expect(mockCtx.calls).not.toEqual(
      expect.arrayContaining(["CLOSED TRADES", "AVG ROI/TRADE"])
    );
  });

  it("draws only the stats the user selects", async () => {
    render(<PnLShareCardGenerator />);

    await userEvent.click(
      screen.getByRole("checkbox", { name: /include closed trades/i })
    );
    await generateCard();

    expect(mockCtx.calls).toEqual(
      expect.arrayContaining([
        "PERIOD P&L",
        "WIN RATE",
        "CLOSED TRADES",
      ])
    );
    expect(mockCtx.calls).not.toContain("AVG ROI/TRADE");
  });

  it("keeps at least one stat selected when deselecting down to one", async () => {
    render(<PnLShareCardGenerator />);

    const periodReturn = screen.getByRole("checkbox", {
      name: /include period p&l/i,
    });
    const winRate = screen.getByRole("checkbox", { name: /include win rate/i });

    await userEvent.click(winRate);
    expect(periodReturn).toBeChecked();
    expect(winRate).not.toBeChecked();

    await userEvent.click(periodReturn);
    expect(periodReturn).toBeChecked();
  });

  it("enables download and share only after a preview exists", async () => {
    render(<PnLShareCardGenerator />);
    expect(screen.getByRole("button", { name: /download image/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^share$/i })).toBeDisabled();

    await generateCard();

    expect(screen.getByRole("button", { name: /download image/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^share$/i })).toBeEnabled();
  });
});

describe("PnLShareCardGenerator – no sensitive data in output", () => {
  const SENSITIVE_PATTERNS = [
    /^G[A-Z2-7]{55}$/, // Stellar public key
    /wallet/i,
    /address/i,
    /balance/i,
  ];

  it("never draws a wallet address, account balance, or identifier onto the card", async () => {
    render(<PnLShareCardGenerator />);

    // Select every available stat to maximize what gets drawn.
    for (const checkbox of screen.getAllByRole("checkbox")) {
      if (!(checkbox as HTMLInputElement).checked) {
        await userEvent.click(checkbox);
      }
    }
    await generateCard();

    expect(mockCtx.calls.length).toBeGreaterThan(0);
    for (const text of mockCtx.calls) {
      for (const pattern of SENSITIVE_PATTERNS) {
        expect(text).not.toMatch(pattern);
      }
    }
  });
});
