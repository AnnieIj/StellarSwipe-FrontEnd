import type { Meta, StoryObj } from "@storybook/react";
import { SignalCard } from "@/components/SignalCard";

const ROI = [
  { value: 0 },
  { value: 1.2 },
  { value: 0.8 },
  { value: 2.1 },
  { value: 1.9 },
  { value: 3.4 },
  { value: 2.8 },
  { value: 4.2 },
];

const base = {
  pair: "XLM/USDC",
  executionPrice: 0.1234,
  confidence: 82,
  projectedTarget: 0.15,
  roiHistory: ROI,
  analysis:
    "Strong bullish momentum with support at 0.12. RSI shows oversold conditions.",
  action: "BUY" as const,
  timestamp: new Date("2024-01-15T10:00:00Z"),
  providerName: "Alpha Signals",
  providerReputation: 92,
  providerStake: 500,
  hasAccess: true,
};

const meta: Meta<typeof SignalCard> = {
  title: "Components/SignalCard",
  component: SignalCard,
  tags: ["autodocs"],
  parameters: {
    chromatic: { viewports: [375, 768] },
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SignalCard>;

export const Default: Story = {
  args: base,
};

export const SellSignal: Story = {
  args: { ...base, action: "SELL", pair: "BTC/USDC", executionPrice: 45000 },
};

export const Bookmarked: Story = {
  args: { ...base },
  play: async () => {},
};

export const Premium: Story = {
  args: { ...base, isPremium: true, hasAccess: false, requiredStake: 1000 },
};

export const PremiumWithAccess: Story = {
  args: { ...base, isPremium: true, hasAccess: true, requiredStake: 1000 },
};

export const WithStakeBadge: Story = {
  args: { ...base, providerStake: 2500 },
};

export const Loading: Story = {
  args: { loading: true },
};

export const Expired: Story = {
  args: {
    ...base,
    timestamp: new Date("2023-01-01T00:00:00Z"),
    conflictReason: "signal_expired" as const,
  },
};

export const LowConfidence: Story = {
  args: { ...base, confidence: 45 },
};

export const HighConfidence: Story = {
  args: { ...base, confidence: 98 },
};
