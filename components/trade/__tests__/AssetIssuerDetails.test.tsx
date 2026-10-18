/**
 * @jest-environment jsdom
 *
 * Asset issuer details in trade review (#806): long issuer addresses are
 * shortened but copyable, the network is shown for both sides, and missing
 * issuer metadata is called out without disabling the review's actions.
 */

import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { AssetIssuerDetails } from "@/components/trade/AssetIssuerDetails";
import { TradeConfirmationModal } from "@/components/trade/TradeConfirmationModal";
import { useWalletStore } from "@/store/useWalletStore";

jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("AssetIssuerDetails", () => {
  let writeText: jest.Mock;

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  it("shows asset code, shortened issuer and network for both sides", () => {
    render(
      <AssetIssuerDetails
        network="PUBLIC"
        sides={[
          { label: "You pay", asset: { code: "XLM" } },
          { label: "You receive", asset: { code: "USDC", issuer: ISSUER } },
        ]}
      />
    );

    const pay = screen.getByRole("listitem", { name: "You pay: XLM" });
    expect(within(pay).getByText("Native asset (no issuer)")).toBeInTheDocument();
    expect(within(pay).getByText("Mainnet (Public)")).toBeInTheDocument();

    const receive = screen.getByRole("listitem", { name: "You receive: USDC" });
    const shortIssuer = within(receive).getByText("GA5ZSE…K4KZVN");
    // Full address stays available for hover and assistive tech.
    expect(shortIssuer).toHaveAttribute("title", ISSUER);
    expect(within(receive).getByText("Mainnet (Public)")).toBeInTheDocument();
    // The long address itself is never rendered unshortened inline.
    expect(within(receive).queryByText(ISSUER)).not.toBeInTheDocument();

    expect(screen.getByTestId("asset-network-badge")).toHaveTextContent(
      "Mainnet (Public)"
    );
  });

  it("copies the full long issuer address, not the shortened display", async () => {
    render(
      <AssetIssuerDetails
        network="TESTNET"
        sides={[{ label: "You receive", asset: { code: "USDC", issuer: ISSUER } }]}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Copy USDC issuer address" })
      );
    });

    expect(writeText).toHaveBeenCalledWith(ISSUER);
    expect(await screen.findByText("Issuer address copied")).toBeInTheDocument();
  });

  it("calls out missing issuer metadata", () => {
    render(
      <AssetIssuerDetails
        network="TESTNET"
        sides={[
          { label: "You pay", asset: { code: "XLM" } },
          { label: "You receive", asset: { code: "USDC" } },
        ]}
      />
    );

    const receive = screen.getByRole("listitem", { name: "You receive: USDC" });
    expect(within(receive).getByText("Not available")).toBeInTheDocument();
    expect(within(receive).getByRole("note")).toHaveTextContent(
      /issuer details for USDC are unavailable/i
    );
    expect(
      within(receive).queryByRole("button", { name: /copy/i })
    ).not.toBeInTheDocument();

    // Native side is unaffected.
    const pay = screen.getByRole("listitem", { name: "You pay: XLM" });
    expect(within(pay).queryByRole("note")).not.toBeInTheDocument();
  });

  it("flags a malformed issuer address but still allows copying it", () => {
    render(
      <AssetIssuerDetails
        network="TESTNET"
        sides={[
          { label: "You receive", asset: { code: "USDC", issuer: "BADISSUER" } },
        ]}
      />
    );

    expect(screen.getByRole("note")).toHaveTextContent(/not a valid Stellar address/i);
    expect(
      screen.getByRole("button", { name: "Copy USDC issuer address" })
    ).toBeInTheDocument();
  });
});

describe("TradeConfirmationModal asset verification", () => {
  beforeEach(() => {
    useWalletStore.setState({ network: "TESTNET" });
  });

  const baseDetails = {
    orderType: "market" as const,
    fromSymbol: "XLM",
    fromAmount: "100",
    toSymbol: "USDC",
    toAmount: "12.34",
    price: "0.1234",
    minReceived: "12.28",
  };

  it("shows issuer and network details for both sides using the wallet network", () => {
    render(
      <TradeConfirmationModal
        open
        onOpenChange={jest.fn()}
        details={{ ...baseDetails, toAsset: { issuer: ISSUER } }}
      />
    );

    expect(screen.getByRole("listitem", { name: "You pay: XLM" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("listitem", { name: "You receive: USDC" })).getByText(
        "GA5ZSE…K4KZVN"
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId("asset-network-badge")).toHaveTextContent("Testnet");
  });

  it("prefers an explicit network over the wallet store", () => {
    render(
      <TradeConfirmationModal
        open
        onOpenChange={jest.fn()}
        details={{ ...baseDetails, network: "PUBLIC", toAsset: { issuer: ISSUER } }}
      />
    );

    expect(screen.getByTestId("asset-network-badge")).toHaveTextContent(
      "Mainnet (Public)"
    );
  });

  it("keeps confirm and close available when issuer metadata is missing", () => {
    const onConfirm = jest.fn();
    render(
      <TradeConfirmationModal
        open
        onOpenChange={jest.fn()}
        details={baseDetails}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole("note")).toHaveTextContent(/USDC are unavailable/i);

    const confirm = screen.getByRole("button", { name: /^confirm/i });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Close confirmation modal" })
    ).toBeEnabled();
  });
});
