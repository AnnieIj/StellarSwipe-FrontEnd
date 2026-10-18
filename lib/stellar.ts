import { Horizon } from "@stellar/stellar-sdk";

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Minimum XLM a signal provider must stake to remain listed on the protocol */
export const PROTOCOL_MIN_STAKE_XLM = 1000;
/**
 * Fraction above the minimum at which a low-stake warning badge is shown.
 * E.g. 0.2 means warn when providerStake <= 1200 XLM (20% above the 1000 XLM floor).
 */
export const LOW_STAKE_WARNING_MARGIN = 0.2;

export const server = new Horizon.Server(HORIZON_URL);

export async function getAccountBalances(publicKey: string) {
  const account = await server.loadAccount(publicKey);
  return account.balances;
}
