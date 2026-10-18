/**
 * Tests for PortfolioHoldingDetail (#796)
 *
 * Covers: complete position data, missing cost basis, partial P&L data,
 * privacy-mask behaviour, and accessible labels.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioHoldingDetail } from "@/components/PortfolioHoldingDetail";
import type { PortfolioAsset } from "@/store/usePortfolioStore";

// ── privacy store mock ────────────────────────────────────────────────────────
const privacyState = { privacyMode: false };
vi.mock("@/store/usePrivacyStore", () => ({
  usePrivacyStore: () => privacyState,
  PRIVACY_MASK: "••••••",
}));

const BASE_ASSET: PortfolioAsset = {
  symbol: "XLM",
  name: "Stellar Lumens",
  value: 1234.56,
  percentage: 42.5,
  color: "#7C3AED",
  costBasis: 1000.0,
  realizedPnL: 150.25,
  unrealizedPnL: 84.31,
};

describe("PortfolioHoldingDetail", () => {
  beforeEach(() => {
    privacyState.privacyMode = false;
  });

  // ── complete position ───────────────────────────────────────────────────────
  describe("complete position data", () => {
    it("renders the asset name and symbol", () => {
      render(<PortfolioHoldingDetail asset={BASE_ASSET} />);
      expect(screen.getByText("Stellar Lumens")).toBeInTheDocument();
      expect(screen.getByText("(XLM)")).toBeInTheDocument();
    });

    it("renders the current value", () => {
      render(<PortfolioHoldingDetail asset={BASE_ASSET} />);
      expect(
        screen.getByLabelText(/current value: \$1,234\.56/i)
      ).toBeInTheDocument();
    });

    it("renders the cost basis", () => {
      render(<PortfolioHoldingDetail asset={BASE_ASSET} />);
      expect(
        screen.getByLabelText(/cost basis: \$1,000\.00/i)
      ).toBeInTheDocument();
    });

    it("renders realized P&L with + prefix for positive", () => {
      render(<PortfolioHoldingDetail asset={BASE_ASSET} />);
      expect(
        screen.getByLabelText(/realized p\/l: \+\$150\.25/i)
      ).toBeInTheDocument();
    });

    it("renders unrealized P&L with + prefix for positive", () => {
      render(<PortfolioHoldingDetail asset={BASE_ASSET} />);
      expect(
        screen.getByLabelText(/unrealized p\/l: \+\$84\.31/i)
      ).toBeInTheDocument();
    });

    it("renders the allocation percentage", () => {
      render(<PortfolioHoldingDetail asset={BASE_ASSET} />);
      expect(screen.getByLabelText(/allocation: 42\.5 percent/i)).toBeInTheDocument();
    });
  });

  // ── missing cost basis ──────────────────────────────────────────────────────
  describe("missing cost basis", () => {
    it("shows 'Unavailable' when costBasis is undefined", () => {
      const asset = { ...BASE_ASSET, costBasis: undefined };
      render(<PortfolioHoldingDetail asset={asset} />);
      expect(
        screen.getByLabelText(/cost basis unavailable/i)
      ).toBeInTheDocument();
    });
  });

  // ── partial P&L ─────────────────────────────────────────────────────────────
  describe("partial P&L data", () => {
    it("shows 'No data' for undefined realizedPnL", () => {
      const asset = { ...BASE_ASSET, realizedPnL: undefined };
      render(<PortfolioHoldingDetail asset={asset} />);
      expect(
        screen.getByLabelText(/realized p\/l unavailable/i)
      ).toBeInTheDocument();
    });

    it("shows 'No data' for undefined unrealizedPnL", () => {
      const asset = { ...BASE_ASSET, unrealizedPnL: undefined };
      render(<PortfolioHoldingDetail asset={asset} />);
      expect(
        screen.getByLabelText(/unrealized p\/l unavailable/i)
      ).toBeInTheDocument();
    });

    it("renders negative P&L without + prefix", () => {
      const asset = { ...BASE_ASSET, realizedPnL: -55.5 };
      render(<PortfolioHoldingDetail asset={asset} />);
      expect(
        screen.getByLabelText(/realized p\/l: -\$55\.50/i)
      ).toBeInTheDocument();
    });
  });

  // ── privacy mask ────────────────────────────────────────────────────────────
  describe("privacy mode", () => {
    it("masks current value when privacyMode is true", () => {
      privacyState.privacyMode = true;
      render(<PortfolioHoldingDetail asset={BASE_ASSET} />);
      const cells = screen.getAllByText("••••••");
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  // ── accessibility ────────────────────────────────────────────────────────────
  describe("accessibility", () => {
    it("has a region with an accessible name", () => {
      render(<PortfolioHoldingDetail asset={BASE_ASSET} />);
      expect(
        screen.getByRole("region", { name: /stellar lumens holding detail/i })
      ).toBeInTheDocument();
    });
  });
});
