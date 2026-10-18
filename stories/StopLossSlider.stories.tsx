import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { StopLossSlider } from "@/components/ui/stop-loss-slider";

const meta: Meta<typeof StopLossSlider> = {
  title: "UI/StopLossSlider",
  component: StopLossSlider,
  tags: ["autodocs"],
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
    disabled: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div className="w-96 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StopLossSlider>;

export const LowRisk: Story = {
  args: {
    value: 5,
    onChange: () => {},
    entryPrice: 0.1234,
    assetSymbol: "XLM",
  },
};

export const ModerateRisk: Story = {
  args: {
    value: 20,
    onChange: () => {},
    entryPrice: 0.1234,
    assetSymbol: "XLM",
  },
};

export const HighRisk: Story = {
  args: {
    value: 60,
    onChange: () => {},
    entryPrice: 0.1234,
    assetSymbol: "XLM",
  },
};

export const NoStopLoss: Story = {
  args: { value: 0, onChange: () => {}, assetSymbol: "XLM" },
};

export const Disabled: Story = {
  args: { value: 25, onChange: () => {}, disabled: true, entryPrice: 0.1234 },
};

export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState(15);
    return (
      <StopLossSlider
        value={value}
        onChange={setValue}
        entryPrice={0.1234}
        assetSymbol="XLM"
      />
    );
  },
};
