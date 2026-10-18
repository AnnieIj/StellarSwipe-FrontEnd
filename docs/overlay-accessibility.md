Overlay accessibility guidelines

This document outlines recommended practices for modal and overlay behavior in StellarSwipe. It complements code in hooks/useFocusTrap.ts and hooks/overlayManager.ts.

Key rules

- Only the topmost overlay should trap focus and respond to global keyboard shortcuts like Escape.
- Overlays should register themselves with the overlay stack when they mount (useOverlayStack) and unregister on unmount.
- Use aria-modal="true" on modal dialogs and ensure a role of dialog/alertdialog as appropriate.
- Provide an initial focus target with the `initialFocus` option or ensure the first focusable element is meaningful (close buttons, primary actions).
- When a nested overlay opens, the child becomes topmost. On child close, focus should restore to the element that opened that child overlay.

Testing guidance

- Unit tests can exercise useFocusTrap using a small harness component that mounts a few focusable elements and toggles `isActive`.
- For integration/e2e tests, assert that:
  - Tab and Shift+Tab wrap within the topmost overlay.
  - Escape only closes the topmost overlay.
  - Focus is restored to the originating control when an overlay closes.

Implementation notes

- useFocusTrap uses requestAnimationFrame to move focus after render/animation to improve timing reliability.
- overlayManager provides pushOverlay/popOverlay/topOverlay utilities; useOverlayStack wraps these for React components.

