import type { Meta, StoryObj } from "@storybook/react";
import { GlossaryTerm } from "@/components/GlossaryTerm";

const meta: Meta<typeof GlossaryTerm> = {
  title: "UI/GlossaryTerm",
  component: GlossaryTerm,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Wraps a trading term with a dotted underline and shows its definition in an " +
          "accessible tooltip on hover or keyboard focus. The dictionary lives in " +
          "`lib/glossary.ts` — add new terms there, never inline.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof GlossaryTerm>;

export const Slippage: Story = {
  args: { term: "slippage", children: "slippage" },
};

export const StopLoss: Story = {
  args: { term: "stop-loss", children: "stop-loss" },
};

export const Trustline: Story = {
  args: { term: "trustline", children: "trustline" },
};

export const Soroban: Story = {
  args: { term: "soroban", children: "Soroban" },
};

/** If the term isn't in the dictionary, it renders without a tooltip. */
export const UnknownTerm: Story = {
  args: { term: "flux-capacitor", children: "flux-capacitor" },
};

/** GlossaryTerm inline in a paragraph, showing typical usage context. */
export const InParagraph: Story = {
  render: () => (
    <p className="text-sm leading-relaxed max-w-prose">
      When copying a trade, be aware of{" "}
      <GlossaryTerm term="slippage">slippage</GlossaryTerm> — especially on
      low-liquidity pairs. Signal providers with a high{" "}
      <GlossaryTerm term="stake">stake</GlossaryTerm> have more skin in the game
      and tend to set tighter{" "}
      <GlossaryTerm term="stop-loss">stop-loss</GlossaryTerm> levels.
    </p>
  ),
};

/** Multiple terms side by side for visual comparison. */
export const AllTerms: Story = {
  render: () => (
    <ul className="space-y-2 text-sm">
      {[
        "slippage",
        "trustline",
        "claimable balance",
        "stop-loss",
        "take-profit",
        "fee-bump",
        "soroban",
        "xlm",
        "win rate",
        "confidence",
        "stake",
      ].map((term) => (
        <li key={term}>
          <GlossaryTerm term={term}>{term}</GlossaryTerm>
        </li>
      ))}
    </ul>
  ),
};
