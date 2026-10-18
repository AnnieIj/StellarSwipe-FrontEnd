/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GlossaryTerm } from "@/components/GlossaryTerm";

/**
 * GlossaryTerm uses Radix Tooltip (portal-based) for rendering.
 * These tests focus on:
 * - open/close via focus/hover
 * - close via mouse leave/blur
 * - dismiss via Escape
 * - keyboard-only interaction
 */

describe("GlossaryTerm tooltip", () => {
  it("renders a tooltip definition for a known term", async () => {
    render(<GlossaryTerm term="slippage">slippage</GlossaryTerm>);

    const trigger = screen.getByRole("term", { name: /slippage/i });

    await userEvent.hover(trigger);

    expect(
      await screen.findByRole("tooltip", { name: /slippage/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/difference between the expected price/i)
    ).toBeInTheDocument();
  });

  it("opens on focus and closes on blur", async () => {
    render(<GlossaryTerm term="stop-loss">stop-loss</GlossaryTerm>);

    const trigger = screen.getByRole("term", { name: /stop-loss/i });
    const outside = document.createElement("button");
    outside.textContent = "outside";
    document.body.appendChild(outside);

    await userEvent.tab();
    // userEvent.tab focuses the first focusable element in the document.
    // If this test suite has other focusables, we fall back to focusing directly.
    if (document.activeElement !== trigger) {
      trigger.focus();
    }

    expect(await screen.findByRole("tooltip")).toBeInTheDocument();

    await userEvent.tab();
    // Ensure blur has happened
    expect(trigger).not.toHaveFocus();
    expect(screen.queryByRole("tooltip")).toBeNull();

    outside.remove();
  });

  it("closes on mouse leave", async () => {
    render(<GlossaryTerm term="stake">stake</GlossaryTerm>);

    const trigger = screen.getByRole("term", { name: /stake/i });

    await userEvent.hover(trigger);
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();

    await userEvent.unhover(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("dismisses an open tooltip on Escape (keyboard dismissal)", async () => {
    render(<GlossaryTerm term="confidence">confidence</GlossaryTerm>);

    const trigger = screen.getByRole("term", { name: /confidence/i });
    trigger.focus();

    expect(await screen.findByRole("tooltip")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders children unchanged and no tooltip for an unknown term", async () => {
    render(<GlossaryTerm term="flux-capacitor">flux-capacitor</GlossaryTerm>);

    const trigger = screen.getByText(/flux-capacitor/i);

    // The component renders without Radix tooltip when term is missing.
    await userEvent.hover(trigger);

    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

