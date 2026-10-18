/**
 * Central glossary dictionary for trading terminology.
 *
 * Add entries here. The GlossaryTerm component consumes this dictionary.
 * Keys are lowercase (lookup is case-insensitive in the component).
 */
export const glossary: Record<string, string> = {
  slippage:
    "The difference between the expected price of a trade and the actual execution price, caused by market movement or low liquidity.",

  trustline:
    "An explicit opt-in on the Stellar network that allows your account to hold a specific asset issued by a particular issuer.",

  "claimable balance":
    "A Stellar mechanism that allows XLM or other assets to be reserved for a future recipient who can claim them when specific conditions are met.",

  "stop-loss":
    "An order to automatically sell a position when its price falls to a specified level, limiting potential losses.",

  "take-profit":
    "An order that automatically closes a position when the price reaches a specified profit target.",

  "fee bump":
    "A Stellar transaction envelope that allows a sponsor to pay the fee for another account's transaction.",

  "fee-bump":
    "A Stellar transaction envelope that allows a sponsor to pay the fee for another account's transaction.",

  liquidity:
    "A measure of how easily an asset can be bought or sold without significantly affecting its price.",

  xlm: "Lumens — the native cryptocurrency of the Stellar network, used to pay transaction fees and maintain account minimums.",

  soroban:
    "The smart contract platform built on the Stellar network, enabling decentralized applications and on-chain logic.",

  "win rate":
    "The percentage of a signal provider's trades that resulted in profit, used as a measure of their track record.",

  confidence:
    "A signal provider's stated certainty (0–100%) that a given trade signal will reach its target price.",

  "price impact":
    "How much your trade moves the market price, expressed as a percentage. Higher volume trades on thin order books cause larger impact.",

  "market order":
    "An order to buy or sell an asset immediately at the best available current price.",

  "limit order":
    "An order to buy or sell an asset only when it reaches a specified price or better.",

  "copy trading":
    "Automatically replicating the trades of a signal provider in your own account.",

  "signal provider":
    "A trader who publishes buy/sell signals that other users can follow and copy.",

  stake:
    "An amount of XLM locked by a signal provider as collateral, signalling their commitment and skin-in-the-game.",
};

/**
 * Look up a term definition (case-insensitive).
 * Returns `undefined` if the term is not in the dictionary.
 */
export function getDefinition(term: string): string | undefined {
  return glossary[term.toLowerCase()];
}
