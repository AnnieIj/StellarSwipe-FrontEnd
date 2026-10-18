"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  TOOLTIP_FOCUS_SHOW_DELAY_MS,
  TOOLTIP_HIDE_DELAY_MS,
  TOOLTIP_SHOW_DELAY_MS,
  TOOLTIP_TOUCH_DISMISS_MS,
} from "@/lib/tooltipTiming";
import { useTooltipCollision } from "./useTooltipCollision";

export interface UseTooltipOptions {
  /**
   * Override the show delay. Defaults to `TOOLTIP_SHOW_DELAY_MS` for hover
   * and `TOOLTIP_FOCUS_SHOW_DELAY_MS` for keyboard focus.
   */
  showDelayMs?: number;
  /** Override the hide delay. Defaults to `TOOLTIP_HIDE_DELAY_MS`. */
  hideDelayMs?: number;
  /**
   * Override the auto-dismiss delay on touch devices.
   * Defaults to `TOOLTIP_TOUCH_DISMISS_MS`.
   */
  touchDismissMs?: number;
  /** When true the tooltip is disabled entirely. */
  disabled?: boolean;
}

export interface UseTooltipReturn {
  /** Whether the tooltip should currently be visible. */
  isVisible: boolean;
  /** Ref to attach to the tooltip element for collision detection. */
  tooltipRef: React.RefObject<HTMLElement | null>;
  /** Pixel offsets to keep the tooltip inside the viewport. */
  collisionOffset: { x: number; y: number };
  /** Props to spread on the trigger element. */
  triggerProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    "aria-describedby": string;
  };
  /** Unique id to use on the tooltip element: `<div id={tooltipId} role="tooltip">`. */
  tooltipId: string;
  /** Dismiss the tooltip immediately (e.g. after the user activates the trigger). */
  dismiss: () => void;
}

let idCounter = 0;

/**
 * useTooltip (#765)
 * ──────────────────
 * Unified hook for tooltip show/hide with:
 * - Consistent hover, focus, and hide timing via shared constants.
 * - Keyboard access: tooltip shows on focus, hides on Escape or blur.
 * - Touch device support: shows on touchstart, auto-dismisses after a
 *   configurable timeout to prevent stuck overlays.
 * - Collision-safe positioning: delegates to useTooltipCollision to keep the
 *   tooltip fully inside the viewport regardless of scroll or edge proximity.
 *
 * @example
 * function InfoButton() {
 *   const { isVisible, triggerProps, tooltipRef, collisionOffset, tooltipId } =
 *     useTooltip();
 *
 *   return (
 *     <span className="relative inline-block">
 *       <button {...triggerProps} aria-label="More info">ℹ</button>
 *       {isVisible && (
 *         <div
 *           ref={tooltipRef}
 *           id={tooltipId}
 *           role="tooltip"
 *           style={{ transform: `translate(${collisionOffset.x}px, ${collisionOffset.y}px)` }}
 *           className="absolute bottom-full left-1/2 -translate-x-1/2 …"
 *         >
 *           Helpful description
 *         </div>
 *       )}
 *     </span>
 *   );
 * }
 */
export function useTooltip(options: UseTooltipOptions = {}): UseTooltipReturn {
  const {
    showDelayMs,
    hideDelayMs = TOOLTIP_HIDE_DELAY_MS,
    touchDismissMs = TOOLTIP_TOUCH_DISMISS_MS,
    disabled = false,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the current show was triggered by focus (not hover).
  const isFocusTriggerRef = useRef(false);

  // Stable tooltip id (created once per hook instance).
  const tooltipId = useRef(`tooltip-${++idCounter}`).current;

  const clearTimers = useCallback(() => {
    if (showTimerRef.current !== null) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (touchDismissTimerRef.current !== null) {
      clearTimeout(touchDismissTimerRef.current);
      touchDismissTimerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (isFocus: boolean) => {
      if (disabled) return;
      clearTimers();
      isFocusTriggerRef.current = isFocus;
      const delay = showDelayMs ?? (isFocus ? TOOLTIP_FOCUS_SHOW_DELAY_MS : TOOLTIP_SHOW_DELAY_MS);
      showTimerRef.current = setTimeout(() => setIsVisible(true), delay);
    },
    [disabled, showDelayMs, clearTimers]
  );

  const hide = useCallback(() => {
    clearTimers();
    hideTimerRef.current = setTimeout(() => setIsVisible(false), hideDelayMs);
  }, [hideDelayMs, clearTimers]);

  const dismiss = useCallback(() => {
    clearTimers();
    setIsVisible(false);
  }, [clearTimers]);

  // Clean up all timers on unmount.
  useEffect(() => () => clearTimers(), [clearTimers]);

  // Collision-safe positioning from the existing hook.
  const { ref: tooltipRef, offset: collisionOffset } = useTooltipCollision<HTMLElement>(
    isVisible
  );

  const triggerProps = {
    onMouseEnter: () => show(false),
    onMouseLeave: () => hide(),
    onFocus: () => show(true),
    onBlur: () => hide(),
    onTouchStart: (e: React.TouchEvent) => {
      // On touch devices show the tooltip immediately and auto-dismiss.
      // Prevent the subsequent mouse events some browsers fire after touch.
      e.preventDefault();
      clearTimers();
      setIsVisible(true);
      touchDismissTimerRef.current = setTimeout(() => setIsVisible(false), touchDismissMs);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      // Escape dismisses a visible tooltip without activating the trigger.
      if (e.key === "Escape" && isVisible) {
        e.stopPropagation();
        dismiss();
      }
    },
    "aria-describedby": tooltipId,
  };

  return {
    isVisible,
    tooltipRef,
    collisionOffset,
    triggerProps,
    tooltipId,
    dismiss,
  };
}
