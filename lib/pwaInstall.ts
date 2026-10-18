export const INSTALL_DISMISSAL_STORAGE_KEY = "stellar-install-dismissed";
export const INSTALL_DISMISSAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type InstallState =
  | "unavailable"
  | "available"
  | "dismissed"
  | "accepted"
  | "installed"
  | "unsupported";

export type InstallEvent =
  | "prompt_available"
  | "accepted"
  | "dismissed"
  | "installed"
  | "unsupported";

export type InstallPlatform = "ios" | "android" | "desktop" | "unknown";

export interface InstallEnvironment {
  isStandalone: boolean;
  isSecureContext: boolean;
  hasServiceWorker: boolean;
  platform: InstallPlatform;
}

export interface InstallEligibility {
  installable: boolean;
  state: InstallState;
  reason:
    | "already_installed"
    | "insecure_context"
    | "no_service_worker"
    | "ios_requires_manual_install"
    | null;
  guidance: "none" | "browser_prompt" | "ios_manual";
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function deriveInstallEligibility(
  env: InstallEnvironment,
): InstallEligibility {
  if (env.isStandalone) {
    return {
      installable: false,
      state: "installed",
      reason: "already_installed",
      guidance: "none",
    };
  }
  if (!env.isSecureContext) {
    return {
      installable: false,
      state: "unsupported",
      reason: "insecure_context",
      guidance: "none",
    };
  }
  if (!env.hasServiceWorker) {
    return {
      installable: false,
      state: "unsupported",
      reason: "no_service_worker",
      guidance: "none",
    };
  }
  if (env.platform === "ios") {
    return {
      installable: false,
      state: "unavailable",
      reason: "ios_requires_manual_install",
      guidance: "ios_manual",
    };
  }
  return {
    installable: true,
    state: "unavailable",
    reason: null,
    guidance: "browser_prompt",
  };
}

export function installReducer(state: InstallState, event: InstallEvent): InstallState {
  if (event === "installed") return "installed";
  if (event === "unsupported") return "unsupported";
  if (state === "installed" || state === "unsupported") return state;
  switch (event) {
    case "prompt_available":
      return "available";
    case "accepted":
      return "accepted";
    case "dismissed":
      return "dismissed";
  }
}

export function isInstallPromptSuppressed(
  storedAt: number | null,
  now: number,
): boolean {
  if (storedAt === null || !Number.isFinite(storedAt)) return false;
  if (storedAt > now) return true;
  return now - storedAt < INSTALL_DISMISSAL_COOLDOWN_MS;
}

export function readInstallDismissal(storage: StorageLike): number | null {
  try {
    const raw = storage.getItem(INSTALL_DISMISSAL_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function markInstallDismissed(
  storage: StorageLike,
  now: number,
): boolean {
  try {
    storage.setItem(INSTALL_DISMISSAL_STORAGE_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}
