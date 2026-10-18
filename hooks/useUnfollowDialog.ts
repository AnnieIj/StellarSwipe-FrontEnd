"use client";

import { useState, useCallback } from "react";

export interface UnfollowDialogState {
  /** Whether the confirmation dialog is open */
  isOpen: boolean;
  /** Number of open copied positions for the pending unfollow target */
  openPositionsCount: number;
  /** Provider name for display in the dialog */
  providerName: string;
}

export interface UseUnfollowDialogReturn {
  dialogState: UnfollowDialogState;
  /**
   * Request an unfollow. If the provider has zero open positions the
   * `onUnfollow` callback is invoked immediately. Otherwise the dialog is
   * shown so the user can confirm.
   */
  requestUnfollow: (providerName: string, openPositionsCount: number) => void;
  /** Called when the user confirms inside the dialog */
  handleConfirm: () => void;
  /** Called when the user cancels / closes the dialog */
  handleCancel: () => void;
}

const CLOSED_STATE: UnfollowDialogState = {
  isOpen: false,
  openPositionsCount: 0,
  providerName: "",
};

/**
 * Manages the unfollow confirmation flow.
 *
 * - Zero open positions → `onUnfollow` fires immediately (no dialog).
 * - One or more open positions → dialog opens; `onUnfollow` fires only after
 *   explicit user confirmation.
 *
 * @param onUnfollow - Callback that executes the actual unfollow action.
 */
export function useUnfollowDialog(
  onUnfollow: () => void
): UseUnfollowDialogReturn {
  const [dialogState, setDialogState] =
    useState<UnfollowDialogState>(CLOSED_STATE);

  const requestUnfollow = useCallback(
    (providerName: string, openPositionsCount: number) => {
      if (openPositionsCount === 0) {
        onUnfollow();
        return;
      }
      setDialogState({ isOpen: true, openPositionsCount, providerName });
    },
    [onUnfollow]
  );

  const handleConfirm = useCallback(() => {
    setDialogState(CLOSED_STATE);
    onUnfollow();
  }, [onUnfollow]);

  const handleCancel = useCallback(() => {
    setDialogState(CLOSED_STATE);
  }, []);

  return { dialogState, requestUnfollow, handleConfirm, handleCancel };
}
