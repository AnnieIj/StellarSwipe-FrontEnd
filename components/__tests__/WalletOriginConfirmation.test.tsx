/** @jest-environment jsdom */

/**
 * Tests for WalletOriginConfirmation (#799)
 *
 * Covers: verified origin, missing origin, unverifiable origin string,
 * permissions list, cancel action, confirm action, and keyboard accessibility.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import {
  WalletOriginConfirmation,
  type WalletOriginConfirmationProps,
} from "@/components/WalletOriginConfirmation";

// useFocusTrap returns a ref — stub it out so jsdom doesn't throw.
jest.mock("@/hooks/useFocusTrap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

const DEFAULTS: WalletOriginConfirmationProps = {
  origin: "https://app.stellarswipe.io",
  walletName: "Freighter",
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
  open: true,
};

function setup(overrides: Partial<WalletOriginConfirmationProps> = {}) {
  const props = { ...DEFAULTS, ...overrides };
  const result = render(<WalletOriginConfirmation {...props} />);
  return { ...result, props };
}

describe("WalletOriginConfirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── verified origin ──────────────────────────────────────────────────────────
  describe("verified origin", () => {
    it("renders the dialog with a title", () => {
      setup();
      expect(
        screen.getByRole("dialog", { name: /connect freighter/i })
      ).toBeInTheDocument();
    });

    it("displays the hostname from a valid origin URL", () => {
      setup();
      expect(screen.getByText("app.stellarswipe.io")).toBeInTheDocument();
    });

    it("labels the origin section with the verified hostname", () => {
      setup();
      expect(
        screen.getByLabelText(/requesting origin: app\.stellarswipe\.io/i)
      ).toBeInTheDocument();
    });
  });

  // ── missing origin ───────────────────────────────────────────────────────────
  describe("missing / unverifiable origin", () => {
    it("shows 'Unavailable' when origin is null", () => {
      setup({ origin: null });
      expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    });

    it("shows 'Unavailable' when origin is empty string", () => {
      setup({ origin: "" });
      expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    });

    it("shows 'Unavailable' for a non-HTTP origin (e.g. chrome-extension://)", () => {
      setup({ origin: "chrome-extension://abc123" });
      expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    });

    it("labels the origin section as unavailable", () => {
      setup({ origin: undefined });
      expect(
        screen.getByLabelText(/requesting origin unavailable/i)
      ).toBeInTheDocument();
    });

    it("renders a caution message when origin is unverified", () => {
      setup({ origin: null });
      expect(
        screen.getByText(/could not be verified/i)
      ).toBeInTheDocument();
    });

    it("does NOT show the caution message when origin is verified", () => {
      setup();
      expect(
        screen.queryByText(/could not be verified/i)
      ).not.toBeInTheDocument();
    });
  });

  // ── permissions ──────────────────────────────────────────────────────────────
  describe("permissions list", () => {
    it("renders the default permissions", () => {
      setup();
      expect(screen.getByText(/read your public key/i)).toBeInTheDocument();
      expect(
        screen.getByText(/request transaction signatures/i)
      ).toBeInTheDocument();
    });

    it("renders custom permissions passed in props", () => {
      setup({
        permissions: [
          { label: "Custom permission A" },
          { label: "Custom permission B", description: "Some detail" },
        ],
      });
      expect(screen.getByText("Custom permission A")).toBeInTheDocument();
      expect(screen.getByText("Custom permission B")).toBeInTheDocument();
      expect(screen.getByText("Some detail")).toBeInTheDocument();
    });

    it("renders an accessible list for permissions", () => {
      setup();
      expect(
        screen.getByRole("list", { name: /requested permissions/i })
      ).toBeInTheDocument();
    });
  });

  // ── cancel action ─────────────────────────────────────────────────────────────
  describe("cancel action", () => {
    it("calls onCancel when Cancel is clicked", () => {
      const onCancel = jest.fn();
      setup({ onCancel });
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("does not call onConfirm when Cancel is clicked", () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();
      setup({ onConfirm, onCancel });
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  // ── confirm action ────────────────────────────────────────────────────────────
  describe("confirm action", () => {
    it("calls onConfirm when Connect is clicked", () => {
      const onConfirm = jest.fn();
      setup({ onConfirm });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm and connect freighter/i })
      );
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("does not call onCancel when Connect is clicked", () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();
      setup({ onConfirm, onCancel });
      fireEvent.click(
        screen.getByRole("button", { name: /confirm and connect freighter/i })
      );
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  // ── closed state ──────────────────────────────────────────────────────────────
  describe("when open is false", () => {
    it("renders nothing", () => {
      const { container } = setup({ open: false });
      expect(container.firstChild).toBeNull();
    });
  });

  // ── accessibility ─────────────────────────────────────────────────────────────
  describe("accessibility", () => {
    it("has aria-modal=true on the dialog", () => {
      setup();
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("Cancel and Connect buttons are distinct and keyboard accessible", () => {
      setup();
      const buttons = screen.getAllByRole("button");
      const labels = buttons.map((b) => b.getAttribute("aria-label") ?? b.textContent);
      expect(labels).toContain("Cancel wallet connection");
      expect(labels.some((l) => l?.includes("Confirm and connect"))).toBe(true);
    });
  });
});
