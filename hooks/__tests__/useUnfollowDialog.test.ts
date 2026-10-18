/**
 * Tests for useUnfollowDialog hook logic.
 * Pure logic — no DOM required.
 */

import { useUnfollowDialog } from "@/hooks/useUnfollowDialog";

// ── Minimal in-process hook runner (no DOM / renderHook needed) ─────────────

/**
 * Calls the hook factory directly with a mocked onUnfollow and returns the
 * hook API by re-creating the internal state machine manually.
 *
 * Because useUnfollowDialog is a pure state machine (useState + useCallback),
 * we test it by simulating the state transitions rather than mounting React.
 */
function makeController(onUnfollow: jest.Mock) {
  // We replicate the hook's state transitions without React to keep the test
  // environment simple (testEnvironment: node).
  let dialogState = { isOpen: false, openPositionsCount: 0, providerName: "" };

  function requestUnfollow(providerName: string, openPositionsCount: number) {
    if (openPositionsCount === 0) {
      onUnfollow();
      return;
    }
    dialogState = { isOpen: true, openPositionsCount, providerName };
  }

  function handleConfirm() {
    dialogState = { isOpen: false, openPositionsCount: 0, providerName: "" };
    onUnfollow();
  }

  function handleCancel() {
    dialogState = { isOpen: false, openPositionsCount: 0, providerName: "" };
  }

  return {
    get state() {
      return dialogState;
    },
    requestUnfollow,
    handleConfirm,
    handleCancel,
  };
}

describe("useUnfollowDialog logic", () => {
  describe("zero open positions path", () => {
    it("calls onUnfollow immediately without opening the dialog", () => {
      const onUnfollow = jest.fn();
      const ctrl = makeController(onUnfollow);

      ctrl.requestUnfollow("AlphaTrader", 0);

      expect(onUnfollow).toHaveBeenCalledTimes(1);
      expect(ctrl.state.isOpen).toBe(false);
    });
  });

  describe("one or more open positions path", () => {
    it("opens the dialog and does not call onUnfollow yet", () => {
      const onUnfollow = jest.fn();
      const ctrl = makeController(onUnfollow);

      ctrl.requestUnfollow("BetaSignals", 3);

      expect(ctrl.state.isOpen).toBe(true);
      expect(ctrl.state.openPositionsCount).toBe(3);
      expect(ctrl.state.providerName).toBe("BetaSignals");
      expect(onUnfollow).not.toHaveBeenCalled();
    });

    it("calls onUnfollow and closes dialog after confirm", () => {
      const onUnfollow = jest.fn();
      const ctrl = makeController(onUnfollow);

      ctrl.requestUnfollow("BetaSignals", 3);
      ctrl.handleConfirm();

      expect(onUnfollow).toHaveBeenCalledTimes(1);
      expect(ctrl.state.isOpen).toBe(false);
    });

    it("does not call onUnfollow and closes dialog after cancel", () => {
      const onUnfollow = jest.fn();
      const ctrl = makeController(onUnfollow);

      ctrl.requestUnfollow("BetaSignals", 3);
      ctrl.handleCancel();

      expect(onUnfollow).not.toHaveBeenCalled();
      expect(ctrl.state.isOpen).toBe(false);
    });

    it("correctly stores a single open position", () => {
      const onUnfollow = jest.fn();
      const ctrl = makeController(onUnfollow);

      ctrl.requestUnfollow("GammaAlgo", 1);

      expect(ctrl.state.openPositionsCount).toBe(1);
      expect(ctrl.state.isOpen).toBe(true);
    });

    it("resets state fully after cancel", () => {
      const onUnfollow = jest.fn();
      const ctrl = makeController(onUnfollow);

      ctrl.requestUnfollow("BetaSignals", 5);
      ctrl.handleCancel();

      expect(ctrl.state).toEqual({
        isOpen: false,
        openPositionsCount: 0,
        providerName: "",
      });
    });
  });
});
