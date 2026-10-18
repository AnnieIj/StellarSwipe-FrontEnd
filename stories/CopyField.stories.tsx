import type { Meta, StoryObj } from "@storybook/react";
import { CopyField } from "@/components/ui/copy-field";

const WALLET = "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3XXXXXXXXXXXX";

const meta: Meta<typeof CopyField> = {
  title: "UI/CopyField",
  component: CopyField,
  tags: ["autodocs"],
  argTypes: {
    truncate: { control: "boolean" },
    truncateChars: { control: { type: "number", min: 4, max: 20 } },
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
type Story = StoryObj<typeof CopyField>;

export const WalletAddress: Story = {
  args: {
    value: WALLET,
    label: "Wallet Address",
    truncate: true,
    truncateChars: 8,
  },
};

export const TransactionHash: Story = {
  args: {
    value: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    label: "Transaction Hash",
    truncate: true,
  },
};

export const FullValue: Story = {
  args: {
    value: WALLET,
    label: "Full Address",
    truncate: false,
  },
};

export const NoLabel: Story = {
  args: {
    value: WALLET,
    truncate: true,
  },
};

export const ShortValue: Story = {
  args: {
    value: "GSHORT",
    label: "Short Key",
    truncate: true,
  },
};
