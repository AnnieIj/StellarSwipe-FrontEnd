import {
  classifyWalletConnectionError,
  isTimeoutError,
  isUserRejection,
  shouldRetryConnection,
} from "@/lib/walletConnectionErrors";

function walletError(message: string, code?: number): Error {
  const error = new Error(message) as Error & { code?: number };
  if (code !== undefined) error.code = code;
  return error;
}

describe("classifyWalletConnectionError – one reason per failure", () => {
  it("detects a user rejection from the message", () => {
    expect(classifyWalletConnectionError(walletError("User rejected the request")).reason).toBe(
      "user_rejected",
    );
    expect(
      classifyWalletConnectionError(walletError("Request cancelled by the user")).reason,
    ).toBe("user_rejected");
  });

  it("detects a user rejection from the EIP-1193 code", () => {
    expect(
      classifyWalletConnectionError(walletError("opaque failure", 4001)).reason,
    ).toBe("user_rejected");
  });

  it("detects a timeout by message or code", () => {
    expect(classifyWalletConnectionError(walletError("Connection timed out")).reason).toBe(
      "timeout",
    );
    expect(classifyWalletConnectionError(walletError("opaque", -1001)).reason).toBe(
      "timeout",
    );
  });

  it("detects a locked wallet", () => {
    expect(
      classifyWalletConnectionError(walletError("Wallet is locked, please unlock")).reason,
    ).toBe("wallet_locked");
  });

  it("detects a missing wallet or extension", () => {
    expect(classifyWalletConnectionError(walletError("No wallet found")).reason).toBe(
      "wallet_not_found",
    );
    expect(
      classifyWalletConnectionError(walletError("Freighter extension not installed")).reason,
    ).toBe("wallet_not_found");
  });

  it("detects a network failure", () => {
    expect(classifyWalletConnectionError(walletError("Failed to fetch")).reason).toBe(
      "network_unavailable",
    );
  });

  it("falls back to unknown for anything it cannot explain", () => {
    expect(classifyWalletConnectionError(walletError("boom")).reason).toBe("unknown");
    expect(classifyWalletConnectionError(null).reason).toBe("unknown");
    expect(classifyWalletConnectionError(42).reason).toBe("unknown");
  });

  it("handles a thrown string", () => {
    expect(classifyWalletConnectionError("User denied the connection").reason).toBe(
      "user_rejected",
    );
  });

  it("prefers the most specific reason", () => {
    expect(
      classifyWalletConnectionError(
        walletError("User rejected the request while the network was offline"),
      ).reason,
    ).toBe("user_rejected");
  });
});

describe("recovery affordances", () => {
  it("toasts a rejection instead of blocking with a modal", () => {
    const info = classifyWalletConnectionError(walletError("User rejected the request"));
    expect(info.showModal).toBe(false);
    expect(info.retryable).toBe(true);
  });

  it("offers a modal and retry for recoverable failures", () => {
    const info = classifyWalletConnectionError(walletError("Connection timed out"));
    expect(info).toEqual({
      reason: "timeout",
      retryable: true,
      showModal: true,
      i18nKey: "wallet.connect_error.timeout",
    });
  });

  it("does not invite pointless retries for a locked or missing wallet", () => {
    expect(shouldRetryConnection("wallet_locked")).toBe(false);
    expect(shouldRetryConnection("wallet_not_found")).toBe(false);
    expect(shouldRetryConnection("user_rejected")).toBe(true);
    expect(shouldRetryConnection("network_unavailable")).toBe(true);
  });

  it("exposes a translation key per reason", () => {
    expect(classifyWalletConnectionError(walletError("boom")).i18nKey).toBe(
      "wallet.connect_error.unknown",
    );
  });
});

describe("predicates", () => {
  it("recognises a rejection and a timeout independently", () => {
    expect(isUserRejection(walletError("User rejected the request"))).toBe(true);
    expect(isTimeoutError(walletError("User rejected the request"))).toBe(false);
    expect(isTimeoutError(walletError("Connection timed out"))).toBe(true);
    expect(isUserRejection(walletError("boom"))).toBe(false);
  });
});
