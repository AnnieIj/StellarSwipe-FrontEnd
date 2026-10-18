import { create } from "zustand";

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  /** Related signal — notifications sharing it are grouped (#898). */
  signalId?: string;
  signalLabel?: string;
  /** Related provider — used for grouping when no signal is set. */
  providerId?: string;
  providerName?: string;
  /** Destination opened when the notification is selected. */
  href?: string;
}

interface NotificationState {
  notifications: Notification[];
  /** True while a markAllAsRead API call is in flight. */
  isMarkingAllRead: boolean;
  /** Count of notifications with read === false. */
  unreadCount: () => number;
  /** Replace the full notification list (e.g. after a fetch). */
  setNotifications: (notifications: Notification[]) => void;
  /** Mark a single notification as read. */
  markAsRead: (id: string) => void;
  /**
   * Optimistically mark every unread notification as read.
   *
   * Accepts an optional async `persist` callback that mirrors the change to a
   * backend.  If `persist` throws, the store is rolled back to its pre-call
   * state and the error is re-thrown so callers can surface it.
   *
   * When no `persist` is supplied the update is applied locally only.
   */
  markAllAsRead: (persist?: () => Promise<void>) => Promise<void>;
  /** Remove all notifications from the list. */
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [
    {
      id: "1",
      title: "XLM/USDC",
      message: "New BUY signal — high confidence",
      read: false,
    },
    {
      id: "2",
      title: "BTC/XLM",
      message: "New SELL signal — momentum reversal",
      read: false,
    },
  ],

  isMarkingAllRead: false,

  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  setNotifications: (notifications) => set({ notifications }),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllAsRead: async (persist) => {
    const previous = get().notifications;

    // Optimistic update
    set({
      isMarkingAllRead: true,
      notifications: previous.map((n) => ({ ...n, read: true })),
    });

    if (persist) {
      try {
        await persist();
      } catch (err) {
        // Rollback on failure
        set({ notifications: previous, isMarkingAllRead: false });
        throw err;
      }
    }

    set({ isMarkingAllRead: false });
  },

  clearAll: () => set({ notifications: [] }),
}));
