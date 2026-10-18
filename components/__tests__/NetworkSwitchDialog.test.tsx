/**
 * @jest-environment jsdom
 *
 * Network switch preview (#800): the confirmation names both networks,
 * in-progress trade/signing flows block the switch until cancelled, and the
 * app's network changes only after the wallet confirms.
 */

import type { ComponentProps } from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { NetworkSwitchDialog } from "@/components/NetworkSwitchDialog";
import { TradeConfirmationModal } from "@/components/trade/TradeConfirmationModal";
import { useWalletStore } from "@/store/useWalletStore";
import { useActiveFlowsStore } from "@/store/useActiveFlowsStore";

jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));

function deferred() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderDialog(
  props: Partial<ComponentProps<typeof NetworkSwitchDialog>> = {}
) {
  const onOpenChange = jest.fn();
  const onSwitched = jest.fn();
  const utils = render(
    <NetworkSwitchDialog
      open
      targetNetwork="PUBLIC"
      onOpenChange={onOpenChange}
      onSwitched={onSwitched}
      confirmWalletSwitch={jest.fn().mockResolvedValue(undefined)}
      {...props}
    />
  );
  return { ...utils, onOpenChange, onSwitched };
}

describe("NetworkSwitchDialog", () => {
  beforeEach(() => {
    useWalletStore.setState({ network: "TESTNET" });
    useActiveFlowsStore.setState({ flows: [] });
  });

  it("names the current and destination networks", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: "Switch to Mainnet (Public)?" })
    ).toBeInTheDocument();
    const change = screen.getByLabelText("Network change");
    expect(within(change).getByText("Current network").nextSibling).toHaveTextContent(
      "Testnet"
    );
    expect(
      within(change).getByText("Destination network").nextSibling
    ).toHaveTextContent("Mainnet (Public)");
    expect(screen.getByText(/Will reload for Mainnet/)).toBeInTheDocument();
  });

  it("updates the network only after the wallet confirms", async () => {
    const wallet = deferred();
    const confirmWalletSwitch = jest.fn().mockReturnValue(wallet.promise);
    const { onOpenChange, onSwitched } = renderDialog({ confirmWalletSwitch });

    fireEvent.click(screen.getByRole("button", { name: "Switch to Mainnet (Public)" }));

    expect(confirmWalletSwitch).toHaveBeenCalledWith("PUBLIC", expect.any(AbortSignal));
    expect(screen.getByRole("status")).toHaveTextContent(
      /switch to Mainnet \(Public\) in your wallet/i
    );
    // Still waiting: the view has not changed yet.
    expect(useWalletStore.getState().network).toBe("TESTNET");
    expect(
      screen.getByRole("button", { name: "Switch to Mainnet (Public)" })
    ).toBeDisabled();

    await act(async () => {
      wallet.resolve();
    });

    expect(useWalletStore.getState().network).toBe("PUBLIC");
    expect(onSwitched).toHaveBeenCalledWith("PUBLIC");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the current network when the wallet rejects the switch", async () => {
    const confirmWalletSwitch = jest
      .fn()
      .mockRejectedValue(new Error("The wallet didn't switch networks in time."));
    const { onOpenChange, onSwitched } = renderDialog({ confirmWalletSwitch });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Switch to Mainnet (Public)" }));
    });

    expect(useWalletStore.getState().network).toBe("TESTNET");
    expect(onSwitched).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Still on Testnet. The wallet didn't switch networks in time."
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });

  it("ignores a late wallet confirmation after the user stops waiting", async () => {
    const wallet = deferred();
    renderDialog({ confirmWalletSwitch: jest.fn().mockReturnValue(wallet.promise) });

    fireEvent.click(screen.getByRole("button", { name: "Switch to Mainnet (Public)" }));
    fireEvent.click(screen.getByRole("button", { name: "Stop waiting" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/stopped waiting/i);

    await act(async () => {
      wallet.resolve();
    });

    expect(useWalletStore.getState().network).toBe("TESTNET");
  });

  it("identifies an in-progress trade and blocks switching until it is cancelled", async () => {
    const cancelTrade = jest.fn();
    useActiveFlowsStore.getState().registerFlow({
      id: "trade-1",
      kind: "trade",
      label: "XLM → USDC market order",
      cancel: cancelTrade,
    });
    const confirmWalletSwitch = jest.fn().mockResolvedValue(undefined);
    renderDialog({ confirmWalletSwitch });

    const flows = screen.getByRole("list", { name: "In-progress flows" });
    expect(within(flows).getByText("XLM → USDC market order")).toBeInTheDocument();
    expect(within(flows).getByText(/Trade:/)).toBeInTheDocument();

    const switchButton = screen.getByRole("button", { name: "Switch to Mainnet (Public)" });
    expect(switchButton).toBeDisabled();
    fireEvent.click(switchButton);
    expect(confirmWalletSwitch).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel XLM → USDC market order" })
    );

    expect(cancelTrade).toHaveBeenCalledTimes(1);
    expect(useActiveFlowsStore.getState().flows).toHaveLength(0);
    expect(
      screen.queryByRole("list", { name: "In-progress flows" })
    ).not.toBeInTheDocument();
    expect(switchButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(switchButton);
    });
    expect(useWalletStore.getState().network).toBe("PUBLIC");
  });

  it("lists a pending signature without a cancel action", () => {
    useActiveFlowsStore.getState().registerFlow({
      id: "sign-1",
      kind: "signing",
      label: "Transaction waiting for your wallet signature",
    });
    renderDialog();

    expect(screen.getByText(/Signing:/)).toBeInTheDocument();
    expect(screen.getByText("Finish or reject in your wallet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Cancel Transaction/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Switch to Mainnet (Public)" })
    ).toBeDisabled();
  });

  it("cancels every cancellable flow with Cancel all", () => {
    const a = jest.fn();
    const b = jest.fn();
    const { registerFlow } = useActiveFlowsStore.getState();
    registerFlow({ id: "a", kind: "trade", label: "Order A", cancel: a });
    registerFlow({ id: "b", kind: "trade", label: "Order B", cancel: b });
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancel all" }));

    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
    expect(useActiveFlowsStore.getState().flows).toHaveLength(0);
  });
});

describe("TradeConfirmationModal as an active flow", () => {
  beforeEach(() => {
    useActiveFlowsStore.setState({ flows: [] });
  });

  const details = {
    orderType: "market" as const,
    fromSymbol: "XLM",
    fromAmount: "100",
    toSymbol: "USDC",
    toAmount: "12.34",
    price: "0.1234",
    minReceived: "12.28",
  };

  it("registers while open and closes itself when cancelled for a switch", () => {
    const onOpenChange = jest.fn();
    const { rerender } = render(
      <TradeConfirmationModal open onOpenChange={onOpenChange} details={details} />
    );

    const [flow] = useActiveFlowsStore.getState().flows;
    expect(flow).toMatchObject({ kind: "trade", label: "XLM → USDC market order" });

    act(() => {
      useActiveFlowsStore.getState().cancelFlow(flow.id);
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(
      <TradeConfirmationModal open={false} onOpenChange={onOpenChange} details={details} />
    );
    expect(useActiveFlowsStore.getState().flows).toHaveLength(0);
  });

  it("is listed as non-cancellable while submitting", () => {
    render(
      <TradeConfirmationModal
        open
        isSubmitting
        onOpenChange={jest.fn()}
        details={details}
      />
    );

    const [flow] = useActiveFlowsStore.getState().flows;
    expect(flow.kind).toBe("signing");
    expect(flow.cancel).toBeUndefined();
  });

  it("does not register while closed", () => {
    render(
      <TradeConfirmationModal open={false} onOpenChange={jest.fn()} details={details} />
    );
    expect(useActiveFlowsStore.getState().flows).toHaveLength(0);
  });
});
