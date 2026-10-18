import type { Notification } from "@/store/useNotificationStore";

// ---------------------------------------------------------------------------
// Notification grouping by signal and provider (#898)
// ---------------------------------------------------------------------------

export interface NotificationGroup {
  /** Stable key, e.g. "signal:sig-1", "provider:prov-1", or "single:<id>". */
  key: string;
  kind: "signal" | "provider" | "single";
  label: string;
  items: Notification[];
  unreadCount: number;
}

function groupKey(n: Notification): { key: string; kind: NotificationGroup["kind"] } {
  if (n.signalId) return { key: `signal:${n.signalId}`, kind: "signal" };
  if (n.providerId) return { key: `provider:${n.providerId}`, kind: "provider" };
  return { key: `single:${n.id}`, kind: "single" };
}

/**
 * Groups related notifications by signal (preferred) or provider, keeping
 * the order of first appearance. Individual items are kept untouched so
 * read state and destination links are preserved per item.
 */
export function groupNotifications(notifications: Notification[]): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();

  for (const n of notifications) {
    const { key, kind } = groupKey(n);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        kind,
        label:
          kind === "signal"
            ? n.signalLabel ?? n.title
            : kind === "provider"
              ? n.providerName ?? n.title
              : n.title,
        items: [],
        unreadCount: 0,
      };
      groups.set(key, group);
    }
    group.items.push(n);
    if (!n.read) group.unreadCount += 1;
  }

  return Array.from(groups.values());
}

export function isCollapsibleGroup(group: NotificationGroup): boolean {
  return group.items.length > 1;
}
