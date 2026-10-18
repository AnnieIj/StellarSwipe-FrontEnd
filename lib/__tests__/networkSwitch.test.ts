import { NetworkSwitchError, waitForWalletNetwork } from "@/lib/networkSwitch";

describe("waitForWalletNetwork (#800)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resolves once the wallet reports the destination network", async () => {
    const readNetwork = jest
      .fn()
      .mockResolvedValueOnce("TESTNET")
      .mockResolvedValueOnce("TESTNET")
      .mockResolvedValue("public");

    const promise = waitForWalletNetwork("PUBLIC", {
      readNetwork,
      intervalMs: 1_000,
    });
    const settled = jest.fn();
    promise.then(settled);

    await jest.advanceTimersByTimeAsync(1_000);
    expect(settled).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1_000);
    await expect(promise).resolves.toBeUndefined();
    expect(readNetwork).toHaveBeenCalledTimes(3);
  });

  it("rejects with a timeout when the wallet never switches", async () => {
    const readNetwork = jest.fn().mockResolvedValue("TESTNET");
    const promise = waitForWalletNetwork("PUBLIC", {
      readNetwork,
      timeoutMs: 3_000,
      intervalMs: 1_000,
    });
    const caught = promise.catch((e) => e);

    await jest.advanceTimersByTimeAsync(3_000);
    const err = await caught;
    expect(err).toBeInstanceOf(NetworkSwitchError);
    expect(err.reason).toBe("timeout");
  });

  it("rejects as a rejection when the caller aborts", async () => {
    const readNetwork = jest.fn().mockResolvedValue("TESTNET");
    const controller = new AbortController();
    const promise = waitForWalletNetwork("PUBLIC", {
      readNetwork,
      signal: controller.signal,
    });
    const caught = promise.catch((e) => e);

    controller.abort();
    const err = await caught;
    expect(err).toBeInstanceOf(NetworkSwitchError);
    expect(err.reason).toBe("rejected");

    // No further reads after aborting.
    const calls = readNetwork.mock.calls.length;
    await jest.advanceTimersByTimeAsync(5_000);
    expect(readNetwork.mock.calls.length).toBe(calls);
  });

  it("rejects immediately for an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      waitForWalletNetwork("PUBLIC", {
        readNetwork: jest.fn(),
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ reason: "rejected" });
  });

  it("keeps waiting through transient read errors", async () => {
    const readNetwork = jest
      .fn()
      .mockRejectedValueOnce(new Error("busy"))
      .mockResolvedValue("PUBLIC");

    const promise = waitForWalletNetwork("PUBLIC", {
      readNetwork,
      intervalMs: 500,
    });

    await jest.advanceTimersByTimeAsync(500);
    await expect(promise).resolves.toBeUndefined();
  });
});
