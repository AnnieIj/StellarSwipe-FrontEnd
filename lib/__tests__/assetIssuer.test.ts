import {
  getIssuerStatus,
  getNetworkLabel,
  groupAddress,
  isValidIssuerAddress,
  shortenAddress,
} from "@/lib/assetIssuer";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("assetIssuer helpers (#806)", () => {
  describe("shortenAddress", () => {
    it("keeps both ends of a long address readable", () => {
      expect(shortenAddress(ISSUER)).toBe("GA5ZSE…K4KZVN");
    });

    it("supports custom lead/tail lengths", () => {
      expect(shortenAddress(ISSUER, 4, 4)).toBe("GA5Z…KZVN");
    });

    it("returns short strings unchanged", () => {
      expect(shortenAddress("GABC")).toBe("GABC");
      expect(shortenAddress("ABCDEFGHIJKLM")).toBe("ABCDEFGHIJKLM");
    });
  });

  it("groups an address into 4-character chunks without dropping characters", () => {
    const grouped = groupAddress(ISSUER);
    expect(grouped.startsWith("GA5Z SEJY")).toBe(true);
    expect(grouped.replace(/ /g, "")).toBe(ISSUER);
  });

  it("validates Stellar account ids", () => {
    expect(isValidIssuerAddress(ISSUER)).toBe(true);
    expect(isValidIssuerAddress(ISSUER.slice(0, -1))).toBe(false);
    expect(isValidIssuerAddress(`S${ISSUER.slice(1)}`)).toBe(false);
    expect(isValidIssuerAddress(ISSUER.toLowerCase())).toBe(false);
  });

  describe("getIssuerStatus", () => {
    it("treats XLM without an issuer as native", () => {
      expect(getIssuerStatus({ code: "XLM" })).toBe("native");
      expect(getIssuerStatus({ code: "xlm", issuer: null })).toBe("native");
    });

    it("reports a known issuer", () => {
      expect(getIssuerStatus({ code: "USDC", issuer: ISSUER })).toBe("known");
    });

    it("reports missing issuer metadata for non-native assets", () => {
      expect(getIssuerStatus({ code: "USDC" })).toBe("missing");
      expect(getIssuerStatus({ code: "USDC", issuer: "   " })).toBe("missing");
    });

    it("flags a malformed issuer as invalid", () => {
      expect(getIssuerStatus({ code: "USDC", issuer: "not-an-address" })).toBe(
        "invalid"
      );
    });

    it("does not treat an XLM-coded asset with an issuer as native", () => {
      expect(getIssuerStatus({ code: "XLM", issuer: ISSUER })).toBe("known");
    });
  });

  it("labels known networks and passes unknown ones through", () => {
    expect(getNetworkLabel("PUBLIC")).toBe("Mainnet (Public)");
    expect(getNetworkLabel("testnet")).toBe("Testnet");
    expect(getNetworkLabel("CUSTOM")).toBe("CUSTOM");
    expect(getNetworkLabel(undefined)).toBe("Unknown network");
  });
});
