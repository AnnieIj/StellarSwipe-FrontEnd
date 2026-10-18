/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComparisonTray } from "@/components/ComparisonTray";
import { useComparisonStore, MAX_COMPARISON } from "@/store/useComparisonStore";
import type { Signal } from "@/lib/api-types.generated";

// Framer Motion animates exit transitions, keeping elements in the DOM while
// fading out. Replace AnimatePresence and motion.* with synchronous pass-through
// wrappers so assertions don't race the animation clock.
jest.mock("framer-motion", () => {
  const passThrough =
    (tag: string) =>
    // eslint-disable-next-line react/display-name
    ({
      children,
      ...rest
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const {
        initial,
        animate,
        exit,
        transition,
        whileHover,
        whileTap,
        layout,
        ...htmlProps
      } = rest;
      void initial;
      void animate;
      void exit;
      void transition;
      void whileHover;
      void whileTap;
      void layout;
      return React.createElement(tag, htmlProps, children);
    };

  return {
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get(_target, prop: string) {
          return passThrough(prop);
        },
      }
    ),
  };
});

beforeEach(() => {
  useComparisonStore.setState({ signals: [], limitReached: false });
});

function makeSignal(n: number): Signal {
  return {
    id: `sig-${n}`,
    asset: `Signal ${n}`,
    action: "BUY",
    confidence: 75,
    ticker: `Signal ${n}`,
    details: "",
    timestamp: "2024-01-01T00:00:00Z",
  } as Signal;
}

function seedSignals(count: number) {
  for (let i = 1; i <= count; i++) {
    useComparisonStore.getState().addSignal(makeSignal(i));
  }
}

describe("ComparisonTray – rendering", () => {
  it("renders nothing when the tray is empty and no limit banner", () => {
    const { container } = render(<ComparisonTray />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each signal's ticker as a chip", () => {
    seedSignals(3);
    render(<ComparisonTray />);
    expect(screen.getByText("Signal 1")).toBeInTheDocument();
    expect(screen.getByText("Signal 2")).toBeInTheDocument();
    expect(screen.getByText("Signal 3")).toBeInTheDocument();
  });

  it("shows the 'Clear all' button when there are signals", () => {
    seedSignals(2);
    render(<ComparisonTray />);
    expect(
      screen.getByRole("button", { name: /clear all/i })
    ).toBeInTheDocument();
  });
});

describe("ComparisonTray – limit-reached banner", () => {
  it("shows the limit message when limitReached is true", () => {
    useComparisonStore.setState({
      limitReached: true,
      signals: [makeSignal(1)],
    });
    render(<ComparisonTray />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      `up to ${MAX_COMPARISON} signals`
    );
  });

  it("does not show the limit message when limitReached is false", () => {
    seedSignals(2);
    render(<ComparisonTray />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("dismisses the banner when the dismiss button is clicked", async () => {
    useComparisonStore.setState({
      limitReached: true,
      signals: [makeSignal(1)],
    });
    render(<ComparisonTray />);

    await userEvent.click(
      screen.getByRole("button", { name: /dismiss limit message/i })
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(useComparisonStore.getState().limitReached).toBe(false);
  });

  it("shows limit banner after attempting to add beyond MAX_COMPARISON", () => {
    seedSignals(MAX_COMPARISON);
    useComparisonStore.getState().addSignal(makeSignal(MAX_COMPARISON + 1));
    render(<ComparisonTray />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("ComparisonTray – per-item remove", () => {
  it("renders a remove button for each signal", () => {
    seedSignals(3);
    render(<ComparisonTray />);
    const removeButtons = screen.getAllByRole("button", {
      name: /remove .* from comparison/i,
    });
    expect(removeButtons).toHaveLength(3);
  });

  it("removes only the clicked signal", async () => {
    seedSignals(3);
    render(<ComparisonTray />);

    await userEvent.click(
      screen.getByRole("button", { name: /remove Signal 2 from comparison/i })
    );

    expect(screen.queryByText("Signal 2")).not.toBeInTheDocument();
    expect(screen.getByText("Signal 1")).toBeInTheDocument();
    expect(screen.getByText("Signal 3")).toBeInTheDocument();

    const { signals } = useComparisonStore.getState();
    expect(signals.map((s) => s.id)).toEqual(["sig-1", "sig-3"]);
  });
});

describe("ComparisonTray – clear all", () => {
  it("clears all signals when 'Clear all' is clicked", async () => {
    seedSignals(3);
    render(<ComparisonTray />);

    await userEvent.click(screen.getByRole("button", { name: /clear all/i }));

    expect(useComparisonStore.getState().signals).toHaveLength(0);
    expect(screen.queryByText("S1")).not.toBeInTheDocument();
  });

  it("keeps per-item remove buttons working alongside clear all", () => {
    seedSignals(2);
    render(<ComparisonTray />);
    expect(
      screen.getAllByRole("button", { name: /remove .* from comparison/i })
    ).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /clear all/i })
    ).toBeInTheDocument();
  });
});

describe("ComparisonTray – metric definitions", () => {
  it("exposes a keyboard-accessible help button for each metric", () => {
    seedSignals(2);
    render(<ComparisonTray />);

    const helpButtons = screen.getAllByRole("button", {
      name: /what does .* mean/i,
    });
    expect(helpButtons.length).toBeGreaterThan(0);
    helpButtons.forEach((btn) => {
      expect(btn).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("opens a metric definition via keyboard and announces it", async () => {
    seedSignals(2);
    render(<ComparisonTray />);

    const helpButton = screen.getAllByRole("button", {
      name: /what does .* mean/i,
    })[0];

    helpButton.focus();
    expect(helpButton).toHaveFocus();

    await userEvent.keyboard("{Enter}");

    expect(helpButton).toHaveAttribute("aria-expanded", "true");
    const definition = screen.getByRole("tooltip");
    expect(definition).toBeInTheDocument();
    expect(definition).toHaveTextContent(/./);
  });

  it("dismisses the metric definition with Escape", async () => {
    seedSignals(2);
    render(<ComparisonTray />);

    const helpButton = screen.getAllByRole("button", {
      name: /what does .* mean/i,
    })[0];

    await userEvent.click(helpButton);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(helpButton).toHaveAttribute("aria-expanded", "false");
  });

  it("does not render a generic explanation for unknown metrics", () => {
    seedSignals(1);
    render(<ComparisonTray />);

    // Unknown metrics must not surface a help affordance at all.
    expect(
      screen.queryByRole("button", { name: /what does unknown mean/i })
    ).not.toBeInTheDocument();
  });
});

describe("ComparisonTray – scale control", () => {
  it("renders a labeled control for switching scale modes", () => {
    seedSignals(2);
    render(<ComparisonTray />);

    expect(
      screen.getByRole("group", { name: /scale/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /normalized/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /absolute/i })
    ).toBeInTheDocument();
  });

  it("defaults to the normalized scale", () => {
    seedSignals(2);
    render(<ComparisonTray />);

    expect(
      screen.getByRole("radio", { name: /normalized/i })
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /absolute/i })
    ).not.toBeChecked();
  });

  it("switches to the absolute scale and reflects it in the chart summary", async () => {
    seedSignals(2);
    render(<ComparisonTray />);

    await userEvent.click(screen.getByRole("radio", { name: /absolute/i }));

    expect(
      screen.getByRole("radio", { name: /absolute/i })
    ).toBeChecked();
    expect(
      screen.getByRole("img", { name: /absolute/i })
    ).toBeInTheDocument();
  });

  it("reflects the normalized scale in the chart summary", () => {
    seedSignals(2);
    render(<ComparisonTray />);

    expect(
      screen.getByRole("img", { name: /normalized/i })
    ).toBeInTheDocument();
  });

  it("preserves selected comparison items when switching scale modes", async () => {
    seedSignals(3);
    render(<ComparisonTray />);

    await userEvent.click(screen.getByRole("radio", { name: /absolute/i }));

    expect(screen.getByText("Signal 1")).toBeInTheDocument();
    expect(screen.getByText("Signal 2")).toBeInTheDocument();
    expect(screen.getByText("Signal 3")).toBeInTheDocument();
    expect(useComparisonStore.getState().signals.map((s) => s.id)).toEqual([
      "sig-1",
      "sig-2",
      "sig-3",
    ]);
  });
});
