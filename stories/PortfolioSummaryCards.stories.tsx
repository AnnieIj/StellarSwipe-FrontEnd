import type { Meta, StoryFn, StoryObj } from "@storybook/react";
import { PortfolioSummaryCards } from "@/components/PortfolioSummaryCards";
import {
  usePortfolioStore,
  type PortfolioAsset,
} from "@/store/usePortfolioStore";

// ── Mock assets ───────────────────────────────────────────────────────────────

const XLM: PortfolioAsset = {
  symbol: "XLM",
  name: "Stellar Lumens",
  value: 4_820,
  percentage: 48.2,
  color: "#6366f1",
  realizedPnL: 320,
  unrealizedPnL: 150,
};

const USDC: PortfolioAsset = {
  symbol: "USDC",
  name: "USD Coin",
  value: 3_000,
  percentage: 30,
  color: "#22c55e",
  realizedPnL: 0,
  unrealizedPnL: 0,
};

const BTC: PortfolioAsset = {
  symbol: "BTC",
  name: "Bitcoin",
  value: 2_180,
  percentage: 21.8,
  color: "#f59e0b",
  realizedPnL: -80,
  unrealizedPnL: -40,
};

const LOSS_ASSET: PortfolioAsset = {
  symbol: "DOT",
  name: "Polkadot",
  value: 1_500,
  percentage: 100,
  color: "#ec4899",
  realizedPnL: -200,
  unrealizedPnL: -350,
};

const ZERO_POSITION: PortfolioAsset = {
  symbol: "AQUA",
  name: "Aquarius",
  value: 0,
  percentage: 0,
  color: "#8b5cf6",
  realizedPnL: 0,
  unrealizedPnL: 0,
};

// ── Store injection decorator ─────────────────────────────────────────────────

function withPortfolioState(
  assets: PortfolioAsset[],
  totalValue: number,
  totalRealizedPnL: number,
  totalUnrealizedPnL: number
) {
  return (Story: StoryFn) => {
    usePortfolioStore.setState({
      assets,
      totalValue,
      totalRealizedPnL,
      totalUnrealizedPnL,
      isLoading: false,
      lastUpdated: new Date("2026-01-01T12:00:00Z"),
    });
    return <Story />;
  };
}

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta: Meta<typeof PortfolioSummaryCards> = {
  title: "Components/PortfolioSummaryCards",
  component: PortfolioSummaryCards,
  tags: ["autodocs"],
  parameters: {
    chromatic: { viewports: [375, 768, 1280] },
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PortfolioSummaryCards>;

// ── Profitable portfolio ──────────────────────────────────────────────────────

export const Profitable: Story = {
  name: "Profitable portfolio",
  decorators: [
    withPortfolioState(
      [XLM, USDC, BTC],
      10_000,
      XLM.realizedPnL! + BTC.realizedPnL!, // 240
      XLM.unrealizedPnL! + BTC.unrealizedPnL! // 110
    ),
  ],
};

export const ProfitableLight: Story = {
  name: "Profitable – Light",
  parameters: { themes: { themeOverride: "light" } },
  decorators: [withPortfolioState([XLM, USDC, BTC], 10_000, 240, 110)],
};

export const ProfitableDark: Story = {
  name: "Profitable – Dark",
  parameters: { themes: { themeOverride: "dark" } },
  decorators: [withPortfolioState([XLM, USDC, BTC], 10_000, 240, 110)],
};

// ── Loss state ────────────────────────────────────────────────────────────────

export const AtLoss: Story = {
  name: "Portfolio at loss",
  decorators: [
    withPortfolioState(
      [LOSS_ASSET],
      LOSS_ASSET.value,
      LOSS_ASSET.realizedPnL!,
      LOSS_ASSET.unrealizedPnL!
    ),
  ],
};

export const AtLossLight: Story = {
  name: "Portfolio at loss – Light",
  parameters: { themes: { themeOverride: "light" } },
  decorators: [withPortfolioState([LOSS_ASSET], 1_500, -200, -350)],
};

export const AtLossDark: Story = {
  name: "Portfolio at loss – Dark",
  parameters: { themes: { themeOverride: "dark" } },
  decorators: [withPortfolioState([LOSS_ASSET], 1_500, -200, -350)],
};

// ── Break-even (zero P/L) ─────────────────────────────────────────────────────

export const BreakEven: Story = {
  name: "Break-even (zero P/L)",
  decorators: [withPortfolioState([USDC], USDC.value, 0, 0)],
};

// ── Empty portfolio ───────────────────────────────────────────────────────────

export const Empty: Story = {
  name: "Empty portfolio",
  decorators: [withPortfolioState([], 0, 0, 0)],
};

export const EmptyLight: Story = {
  name: "Empty portfolio – Light",
  parameters: { themes: { themeOverride: "light" } },
  decorators: [withPortfolioState([], 0, 0, 0)],
};

export const EmptyDark: Story = {
  name: "Empty portfolio – Dark",
  parameters: { themes: { themeOverride: "dark" } },
  decorators: [withPortfolioState([], 0, 0, 0)],
};

// ── Mixed positions (some with zero value) ────────────────────────────────────

export const MixedPositions: Story = {
  name: "Mixed positions (one closed)",
  decorators: [
    withPortfolioState(
      [XLM, USDC, BTC, ZERO_POSITION],
      XLM.value + USDC.value + BTC.value, // ZERO_POSITION adds 0
      240,
      110
    ),
  ],
};

// ── Large balance ─────────────────────────────────────────────────────────────

export const LargeBalance: Story = {
  name: "Large balance ($1M+)",
  decorators: [
    withPortfolioState(
      [
        { ...XLM, value: 600_000, percentage: 60 },
        { ...USDC, value: 300_000, percentage: 30 },
        { ...BTC, value: 100_000, percentage: 10 },
      ],
      1_000_000,
      12_400,
      8_600
    ),
  ],
};

// ── Single asset ──────────────────────────────────────────────────────────────

export const SingleAsset: Story = {
  name: "Single asset",
  decorators: [
    withPortfolioState([XLM], XLM.value, XLM.realizedPnL!, XLM.unrealizedPnL!),
  ],
};
