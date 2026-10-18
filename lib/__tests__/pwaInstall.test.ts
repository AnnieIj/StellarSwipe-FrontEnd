import {
  INSTALL_DISMISSAL_COOLDOWN_MS,
  INSTALL_DISMISSAL_STORAGE_KEY,
  type InstallEnvironment,
  type StorageLike,
  deriveInstallEligibility,
  installReducer,
  isInstallPromptSuppressed,
  markInstallDismissed,
  readInstallDismissal,
} from "@/lib/pwaInstall";

const NOW = 1_700_000_000_000;

function env(overrides: Partial<InstallEnvironment> = {}): InstallEnvironment {
  return {
    isStandalone: false,
    isSecureContext: true,
    hasServiceWorker: true,
    platform: "android",
    ...overrides,
  };
}

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe("deriveInstallEligibility – only prompt when it can work", () => {
  it("stays quiet once the app is installed", () => {
    const result = deriveInstallEligibility(env({ isStandalone: true }));
    expect(result.installable).toBe(false);
    expect(result.state).toBe("installed");
    expect(result.reason).toBe("already_installed");
  });

  it("refuses to prompt outside a secure context", () => {
    const result = deriveInstallEligibility(env({ isSecureContext: false }));
    expect(result.installable).toBe(false);
    expect(result.reason).toBe("insecure_context");
  });

  it("refuses to prompt without a service worker", () => {
    const result = deriveInstallEligibility(env({ hasServiceWorker: false }));
    expect(result.installable).toBe(false);
    expect(result.reason).toBe("no_service_worker");
    expect(result.state).toBe("unsupported");
  });

  it("guides iOS users to install manually", () => {
    const result = deriveInstallEligibility(env({ platform: "ios" }));
    expect(result.installable).toBe(false);
    expect(result.guidance).toBe("ios_manual");
    expect(result.reason).toBe("ios_requires_manual_install");
  });

  it("uses the browser prompt everywhere else", () => {
    const result = deriveInstallEligibility(env({ platform: "desktop" }));
    expect(result.installable).toBe(true);
    expect(result.guidance).toBe("browser_prompt");
    expect(result.reason).toBeNull();
  });
});

describe("installReducer – the prompt state machine", () => {
  it("becomes available when the browser offers a prompt", () => {
    expect(installReducer("unavailable", "prompt_available")).toBe("available");
  });

  it("records acceptance and dismissal", () => {
    expect(installReducer("available", "accepted")).toBe("accepted");
    expect(installReducer("available", "dismissed")).toBe("dismissed");
  });

  it("stays installed once installed", () => {
    expect(installReducer("installed", "prompt_available")).toBe("installed");
    expect(installReducer("available", "installed")).toBe("installed");
  });

  it("stays unsupported once unsupported", () => {
    expect(installReducer("unsupported", "prompt_available")).toBe("unsupported");
    expect(installReducer("available", "unsupported")).toBe("unsupported");
  });

  it("allows the prompt to come back after a dismissal", () => {
    const dismissed = installReducer("available", "dismissed");
    expect(installReducer(dismissed, "prompt_available")).toBe("available");
  });
});

describe("dismissal cooldown – stop nagging, but not forever", () => {
  it("suppresses the prompt right after a dismissal", () => {
    expect(isInstallPromptSuppressed(NOW, NOW)).toBe(true);
    expect(
      isInstallPromptSuppressed(NOW, NOW + INSTALL_DISMISSAL_COOLDOWN_MS - 1),
    ).toBe(true);
  });

  it("brings the prompt back after the cooldown", () => {
    expect(
      isInstallPromptSuppressed(NOW, NOW + INSTALL_DISMISSAL_COOLDOWN_MS),
    ).toBe(false);
  });

  it("never suppresses when nothing was stored", () => {
    expect(isInstallPromptSuppressed(null, NOW)).toBe(false);
    expect(isInstallPromptSuppressed(Number.NaN, NOW)).toBe(false);
  });

  it("treats a clock skew as still suppressed", () => {
    expect(isInstallPromptSuppressed(NOW + 60_000, NOW)).toBe(true);
  });
});

describe("dismissal storage", () => {
  it("round trips the dismissal timestamp", () => {
    const storage = memoryStorage();
    expect(markInstallDismissed(storage, NOW)).toBe(true);
    expect(storage.data[INSTALL_DISMISSAL_STORAGE_KEY]).toBe(String(NOW));
    expect(readInstallDismissal(storage)).toBe(NOW);
  });

  it("reports nothing when there is no dismissal", () => {
    expect(readInstallDismissal(memoryStorage())).toBeNull();
  });

  it("ignores a corrupted value", () => {
    expect(
      readInstallDismissal(
        memoryStorage({ [INSTALL_DISMISSAL_STORAGE_KEY]: "not-a-number" }),
      ),
    ).toBeNull();
  });

  it("survives storage that throws", () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readInstallDismissal(broken)).toBeNull();
    expect(markInstallDismissed(broken, NOW)).toBe(false);
  });
});
