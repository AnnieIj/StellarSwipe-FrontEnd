"use client";

import { useCallback } from "react";
import { toast } from "@/lib/toast";
import {
  beginBookmarkRequest,
  settleBookmarkRequest,
  useBookmarkStore,
} from "@/store/useBookmarkStore";
import { saveBookmark, removeBookmark as removeBookmarkApi } from "@/lib/bookmarkApi";

function showUndoToast({
  title,
  description,
  undoLabel = "Undo",
  onUndo,
}: {
  title: string;
  description: string;
  undoLabel?: string;
  onUndo: () => void;
}) {
  return toast.info(title, {
    description,
    duration: 4500,
    action: {
      label: undoLabel,
      onClick: onUndo,
    },
  });
}

export function useBookmarkActions() {
  const storeAddBookmark = useBookmarkStore((state) => state.addBookmark);
  const storeRemoveBookmark = useBookmarkStore((state) => state.removeBookmark);
  const toggleStoreBookmark = useBookmarkStore((state) => state.toggleBookmark);
  const hasBookmark = useBookmarkStore((state) => state.hasBookmark);
  const createFolder = useBookmarkStore((state) => state.createFolder);
  const renameFolder = useBookmarkStore((state) => state.renameFolder);
  const deleteFolder = useBookmarkStore((state) => state.deleteFolder);
  const assignSignalToFolder = useBookmarkStore(
    (state) => state.assignSignalToFolder
  );
  const removeSignalFromFolder = useBookmarkStore(
    (state) => state.removeSignalFromFolder
  );

  /**
   * Optimistic bookmark — immediately updates the local store, then syncs
   * with the server. Rolls back on failure.
   */
  const bookmark = useCallback(
    async (id: string) => {
      const prior = useBookmarkStore.getState().hasBookmark(id);
      const seq = beginBookmarkRequest(id);
      storeAddBookmark(id);

      try {
        await saveBookmark(id);
        const settled = settleBookmarkRequest(id, seq, {
          ok: true,
          target: true,
          prior,
        });
        if (!settled.isLatest) return;
        toast.success("Bookmarked", {
          description: "Saved to your bookmark list.",
          duration: 2500,
        });
      } catch (err) {
        const { isLatest, restoreTo } = settleBookmarkRequest(id, seq, {
          ok: false,
          target: true,
          prior,
        });
        // A newer toggle supersedes this one; let it settle the UI.
        if (!isLatest) return;
        // Rollback to the last server-confirmed state
        if (!restoreTo) storeRemoveBookmark(id);
        const message =
          err instanceof Error ? err.message : "Failed to sync bookmark.";
        toast.error("Couldn't save bookmark", {
          description: message,
          duration: 4000,
        });
      }
    },
    [storeAddBookmark, storeRemoveBookmark]
  );

  /**
   * Optimistic unbookmark — immediately removes locally, syncs with server,
   * and shows an undo toast. Rolls back on failure.
   */
  const unbookmark = useCallback(
    async (id: string, label: string) => {
      const prior = useBookmarkStore.getState().hasBookmark(id);
      const seq = beginBookmarkRequest(id);
      storeRemoveBookmark(id);

      const toastId = showUndoToast({
        title: "Bookmark removed",
        description: `${label} was removed from your saved signals.`,
        onUndo: () => {
          // Undo: re-add locally + sync
          storeAddBookmark(id);
          saveBookmark(id).catch(() => {
            // Silent — the local state is already restored
          });
        },
      });

      try {
        await removeBookmarkApi(id);
        settleBookmarkRequest(id, seq, { ok: true, target: false, prior });
      } catch (err) {
        const { isLatest, restoreTo } = settleBookmarkRequest(id, seq, {
          ok: false,
          target: false,
          prior,
        });
        if (!isLatest) return toastId;
        // Rollback to the last server-confirmed state
        if (restoreTo) storeAddBookmark(id);
        const message =
          err instanceof Error ? err.message : "Failed to sync bookmark removal.";
        toast.error("Couldn't remove bookmark", {
          description: message,
          duration: 4000,
        });
      }

      return toastId;
    },
    [storeRemoveBookmark, storeAddBookmark]
  );

  const toggleBookmarkWithUndo = useCallback(
    (id: string, label: string) => {
      if (hasBookmark(id)) {
        return unbookmark(id, label);
      }
      return bookmark(id) as unknown as string;
    },
    [bookmark, hasBookmark, unbookmark]
  );

  const handleCreateFolder = useCallback(
    (name: string) => {
      const id = createFolder(name);
      toast.success("Folder created", {
        description: `"${name}" folder created.`,
        duration: 2500,
      });
      return id;
    },
    [createFolder]
  );

  const handleRenameFolder = useCallback(
    (folderId: string, name: string) => {
      renameFolder(folderId, name);
      toast.success("Folder renamed", {
        description: `Renamed to "${name}".`,
        duration: 2500,
      });
    },
    [renameFolder]
  );

  const handleDeleteFolder = useCallback(
    (folderId: string, folderName: string) => {
      deleteFolder(folderId);
      toast.info("Folder deleted", {
        description: `"${folderName}" and its assignments were removed.`,
        duration: 3500,
      });
    },
    [deleteFolder]
  );

  const handleAssignToFolder = useCallback(
    (signalId: string, folderId: string, folderName: string) => {
      assignSignalToFolder(signalId, folderId);
      toast.success("Assigned", {
        description: `Signal added to "${folderName}".`,
        duration: 2000,
      });
    },
    [assignSignalToFolder]
  );

  const handleRemoveFromFolder = useCallback(
    (signalId: string, folderId: string, folderName: string) => {
      removeSignalFromFolder(signalId, folderId);
      toast.info("Removed", {
        description: `Signal removed from "${folderName}".`,
        duration: 2000,
      });
    },
    [removeSignalFromFolder]
  );

  return {
    addBookmark: bookmark,
    removeBookmark: unbookmark,
    toggleBookmark: (id: string, label: string) =>
      toggleBookmarkWithUndo(id, label),
    hasBookmark,
    directToggleBookmark: toggleStoreBookmark,
    createFolder: handleCreateFolder,
    renameFolder: handleRenameFolder,
    deleteFolder: handleDeleteFolder,
    assignSignalToFolder: handleAssignToFolder,
    removeSignalFromFolder: handleRemoveFromFolder,
  };
}
