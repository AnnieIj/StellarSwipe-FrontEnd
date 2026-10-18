/** @jest-environment jsdom */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { WalletSelectionModal } from "@/components/WalletSelectionModal";
import { WalletConnectErrorModal } from "@/components/WalletConnectErrorModal";

describe("nested overlays (focus / Escape)", () => {
  it("only the topmost overlay responds to Escape and closing restores topmost status", () => {
    const parentClose = jest.fn();
    const childClose = jest.fn();

    // Render both overlays open — the child should be topmost if mounted after.
    const { rerender } = render(
      <>
        <WalletSelectionModal open={true} onClose={parentClose} />
        <WalletConnectErrorModal
          open={true}
          reason={"error"}
          onClose={childClose}
          onRetry={jest.fn()}
        />
      </>
    );

    // Press Escape — only the child (topmost) should close
    fireEvent.keyDown(window, { key: "Escape" });
    expect(childClose).toHaveBeenCalledTimes(1);
    expect(parentClose).toHaveBeenCalledTimes(0);

    // Now simulate child being closed by re-rendering with open=false
    rerender(
      <>
        <WalletSelectionModal open={true} onClose={parentClose} />
        <WalletConnectErrorModal
          open={false}
          reason={"error"}
          onClose={childClose}
          onRetry={jest.fn()}
        />
      </>
    );

    // Press Escape again — now the parent (previously underneath) should close
    fireEvent.keyDown(window, { key: "Escape" });
    expect(parentClose).toHaveBeenCalledTimes(1);
  });
});
