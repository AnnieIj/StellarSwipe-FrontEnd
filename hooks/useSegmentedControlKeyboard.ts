"use client";

import { useCallback, useRef } from "react";

/**
 * Orientation of the segmented control layout.
 * "horizontal" uses Left/Right arrows, "vertical" uses Up/Down.
 */
export type SegmentedOrientation = "horizontal" | "vertical";

interface UseSegmentedControlKeyboardOptions {
  /** Number of items in the group */
  itemCount: number;
  /** Index of the currently active/selected item */
  activeIndex: number;
  /** Called when the user navigates to a new index (for selection) */
  onActiveChange: (index: number) => void;
  /** Layout orientation — defaults to "horizontal" */
  orientation?: SegmentedOrientation;
}

/**
 * Returns a `ref` to attach to the button group container and a
 * `handleKeyDown` handler to place on the container element.
 *
 * Keyboard behaviour follows the WAI-ARIA Radio Group pattern:
 *  - ArrowRight / ArrowDown  → next item (wraps)
 *  - ArrowLeft  / ArrowUp    → previous item (wraps)
 *  - Home → first item
 *  - End  → last item
 *
 * Focus is managed via roving tabindex: only the active item has
 * `tabIndex={0}`, all others have `tabIndex={-1}`.
 */
export function useSegmentedControlKeyboard({
  itemCount,
  activeIndex,
  onActiveChange,
  orientation = "horizontal",
}: UseSegmentedControlKeyboardOptions) {
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const isHorizontal = orientation === "horizontal";
      const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";
      const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";

      let newIndex: number | null = null;

      switch (event.key) {
        case nextKey:
          event.preventDefault();
          newIndex = (activeIndex + 1) % itemCount;
          break;
        case prevKey:
          event.preventDefault();
          newIndex = (activeIndex - 1 + itemCount) % itemCount;
          break;
        case "Home":
          event.preventDefault();
          newIndex = 0;
          break;
        case "End":
          event.preventDefault();
          newIndex = itemCount - 1;
          break;
        default:
          return; // let other keys propagate normally
      }

      if (newIndex !== null) {
        onActiveChange(newIndex);
        // Move DOM focus to the newly active button
        const buttons = groupRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled])',
        );
        buttons?.[newIndex]?.focus();
      }
    },
    [activeIndex, itemCount, onActiveChange, orientation],
  );

  return { groupRef, handleKeyDown } as const;
}
