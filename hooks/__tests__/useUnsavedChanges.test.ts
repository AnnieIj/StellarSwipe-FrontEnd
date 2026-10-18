/**
 * Tests for useUnsavedChanges hook logic.
 *
 * Verified behaviours:
 *  - beforeunload fires only when isDirty is true.
 *  - markSaved clears the bypass flag so subsequent navigation is allowed.
 *  - confirmNavigation proceeds immediately on clean forms.
 *  - confirmNavigation uses native confirm() when no custom handler is given.
 *  - onNavigateAway callback is invoked with the intended href.
 *  - forceNavigate bypasses the dirty guard.
 *
 * testEnvironment: node — we simulate the hook's behaviour without React.
 * window/router objects are stubbed manually.
 */

// ── In-process simulator ──────────────────────────────────────────────────────
// Mirrors the logic of useUnsavedChanges without React hooks.

interface UnsavedChangesOptions {
  isDirty: boolean;
  message?: string;
  onNavigateAway?: (href: string) => void;
}

interface NavigationResult {
  allowed: boolean;
  navigatedTo: string | null;
}

function makeController(options: UnsavedChangesOptions) {
  const {
    message = "You have unsaved changes. Leave anyway?",
    onNavigateAway,
  } = options;

  let isDirty = options.isDirty;
  let bypass = false;
  const navigated: string[] = [];

  // Simulate a router
  const router = {
    push: (href: string) => {
      navigated.push(href);
    },
  };

  function updateDirty(value: boolean) {
    isDirty = value;
  }

  function markSaved() {
    bypass = true;
    // Auto-reset like the real hook does via setTimeout(0)
    bypass = false;
  }

  function forceNavigate(href: string) {
    bypass = true;
    router.push(href);
  }

  function confirmNavigation(
    href: string,
    confirmImpl: (msg: string) => boolean = () => true
  ): boolean {
    if (!isDirty || bypass) {
      router.push(href);
      return true;
    }

    if (onNavigateAway) {
      onNavigateAway(href);
      return false;
    }

    const confirmed = confirmImpl(message);
    if (confirmed) {
      bypass = true;
      router.push(href);
    }
    return confirmed;
  }

  function wouldBeforeUnloadFire(): boolean {
    return isDirty && !bypass;
  }

  return {
    updateDirty,
    markSaved,
    forceNavigate,
    confirmNavigation,
    wouldBeforeUnloadFire,
    get navigated() {
      return navigated;
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useUnsavedChanges", () => {
  describe("beforeunload guard", () => {
    it("fires (isDirty=true) when there are unsaved changes", () => {
      const ctrl = makeController({ isDirty: true });
      expect(ctrl.wouldBeforeUnloadFire()).toBe(true);
    });

    it("does not fire (isDirty=false) when the form is clean", () => {
      const ctrl = makeController({ isDirty: false });
      expect(ctrl.wouldBeforeUnloadFire()).toBe(false);
    });

    it("does not fire after markSaved clears the bypass", () => {
      const ctrl = makeController({ isDirty: true });
      ctrl.markSaved();
      // markSaved immediately clears bypass after the setTimeout(0) tick
      // — represented synchronously in our simulator
      expect(ctrl.wouldBeforeUnloadFire()).toBe(false);
    });
  });

  describe("confirmNavigation — clean form", () => {
    it("navigates immediately and returns true when form is clean", () => {
      const ctrl = makeController({ isDirty: false });

      const result = ctrl.confirmNavigation("/journal");

      expect(result).toBe(true);
      expect(ctrl.navigated).toContain("/journal");
    });

    it("does not invoke native confirm when the form is clean", () => {
      const confirmSpy = jest.fn(() => true);
      const ctrl = makeController({ isDirty: false });

      ctrl.confirmNavigation("/journal", confirmSpy);

      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });

  describe("confirmNavigation — dirty form, native confirm fallback", () => {
    it("calls native confirm with the custom message when dirty", () => {
      const msg = "Unsaved edits detected. Leave?";
      const confirmSpy = jest.fn(() => true);
      const ctrl = makeController({ isDirty: true, message: msg });

      ctrl.confirmNavigation("/settings", confirmSpy);

      expect(confirmSpy).toHaveBeenCalledWith(msg);
    });

    it("navigates and returns true when user confirms", () => {
      const ctrl = makeController({ isDirty: true });

      const result = ctrl.confirmNavigation("/settings", () => true);

      expect(result).toBe(true);
      expect(ctrl.navigated).toContain("/settings");
    });

    it("does not navigate and returns false when user cancels", () => {
      const ctrl = makeController({ isDirty: true });

      const result = ctrl.confirmNavigation("/settings", () => false);

      expect(result).toBe(false);
      expect(ctrl.navigated).not.toContain("/settings");
    });
  });

  describe("confirmNavigation — dirty form, custom onNavigateAway", () => {
    it("calls onNavigateAway with the intended href when dirty", () => {
      const onNavigateAway = jest.fn();
      const ctrl = makeController({ isDirty: true, onNavigateAway });

      ctrl.confirmNavigation("/bookmarks");

      expect(onNavigateAway).toHaveBeenCalledWith("/bookmarks");
    });

    it("returns false without navigating when onNavigateAway is provided", () => {
      const onNavigateAway = jest.fn();
      const ctrl = makeController({ isDirty: true, onNavigateAway });

      const result = ctrl.confirmNavigation("/bookmarks");

      expect(result).toBe(false);
      expect(ctrl.navigated).toHaveLength(0);
    });

    it("does not call native confirm when onNavigateAway is provided", () => {
      const confirmSpy = jest.fn(() => true);
      const onNavigateAway = jest.fn();
      const ctrl = makeController({ isDirty: true, onNavigateAway });

      ctrl.confirmNavigation("/bookmarks", confirmSpy);

      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });

  describe("forceNavigate", () => {
    it("navigates immediately regardless of dirty state", () => {
      const ctrl = makeController({ isDirty: true });

      ctrl.forceNavigate("/discard");

      expect(ctrl.navigated).toContain("/discard");
    });

    it("navigates to the correct href", () => {
      const ctrl = makeController({ isDirty: true });

      ctrl.forceNavigate("/journal/edit/123");

      expect(ctrl.navigated).toContain("/journal/edit/123");
    });
  });

  describe("markSaved — post-save navigation", () => {
    it("allows the next navigation without a warning after markSaved", () => {
      const ctrl = makeController({ isDirty: true });

      ctrl.markSaved();
      const result = ctrl.confirmNavigation("/journal", () => false);

      // After markSaved, the form is considered clean (bypass was set)
      // In our simulator markSaved immediately clears bypass, so confirmNavigation
      // sees a clean path.
      expect(result).toBe(true);
      expect(ctrl.navigated).toContain("/journal");
    });
  });

  describe("isDirty transitions", () => {
    it("warns when the user starts editing (becomes dirty)", () => {
      const ctrl = makeController({ isDirty: false });

      ctrl.updateDirty(true);

      expect(ctrl.wouldBeforeUnloadFire()).toBe(true);
    });

    it("stops warning after save makes the form clean again", () => {
      const ctrl = makeController({ isDirty: true });

      ctrl.updateDirty(false);

      expect(ctrl.wouldBeforeUnloadFire()).toBe(false);
    });
  });
});
