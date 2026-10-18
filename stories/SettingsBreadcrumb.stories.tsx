import type { Meta, StoryObj } from "@storybook/react";
import { SettingsBreadcrumb } from "@/components/SettingsBreadcrumb";

const meta: Meta<typeof SettingsBreadcrumb> = {
  title: "Navigation/SettingsBreadcrumb",
  component: SettingsBreadcrumb,
  tags: ["autodocs"],
  parameters: {
    // next/navigation is mocked by the Storybook Next.js framework
    nextjs: { appDirectory: true },
  },
};

export default meta;
type Story = StoryObj<typeof SettingsBreadcrumb>;

/** Two-level: Settings → Security */
export const TwoLevels: Story = {
  args: {
    segments: [
      { label: "Settings", href: "/settings" },
      { label: "Security", href: "/security" },
    ],
  },
};

/** Three-level: Settings → Security → Active Sessions */
export const ThreeLevels: Story = {
  args: {
    segments: [
      { label: "Settings", href: "/settings" },
      { label: "Security", href: "/security" },
      { label: "Active Sessions", href: "/security/active-sessions" },
    ],
  },
};

/** Four-level: deep nesting example */
export const FourLevels: Story = {
  args: {
    segments: [
      { label: "Settings", href: "/settings" },
      { label: "Billing", href: "/settings/billing" },
      { label: "Invoices", href: "/settings/billing/invoices" },
      { label: "Invoice #1042", href: "/settings/billing/invoices/1042" },
    ],
  },
};

/** Renders nothing — single segment is below the minimum threshold */
export const SingleSegment: Story = {
  args: {
    segments: [{ label: "Settings", href: "/settings" }],
  },
};
