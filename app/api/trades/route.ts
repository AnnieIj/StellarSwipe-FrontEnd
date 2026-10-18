import { NextRequest, NextResponse } from "next/server";
import { getAccountBalances } from "@/lib/stellar";
import {
  TRADE_ERROR_CODES,
  checkAvailableBalance,
  checkTradeLimits,
  rejectTrade,
  tradeRequestSchema,
  type TradeRejection,
} from "@/lib/tradeLimits";

/** The Stellar network the app expects. Matches NetworkMismatchBanner. */
const APP_NETWORK: string = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET";

/**
 * POST /api/trades
 * Revalidates trade limits before the client may submit a transaction.
 * Nothing is submitted here; a 2xx response only means the order may proceed.
 */
export async function POST(req: NextRequest) {
  const parsed = tradeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return rejectResponse(
      rejectTrade(TRADE_ERROR_CODES.INVALID_REQUEST, "Malformed trade request.")
    );
  }

  const order = parsed.data;
  const limitRejection = checkTradeLimits(order, APP_NETWORK);
  if (limitRejection) return rejectResponse(limitRejection);

  // Read the balance from the chain at execution time, never from the client.
  let availableBalance: number;
  try {
    const balances = await getAccountBalances(order.publicKey);
    const native = balances.find((b) => b.asset_type === "native");
    availableBalance = parseFloat(native?.balance ?? "0");
  } catch {
    return rejectResponse(
      rejectTrade(
        TRADE_ERROR_CODES.BALANCE_UNAVAILABLE,
        "Could not verify your balance. Please try again."
      )
    );
  }

  const balanceRejection = checkAvailableBalance(order, availableBalance);
  if (balanceRejection) return rejectResponse(balanceRejection);

  return NextResponse.json({ ok: true }, { status: 200 });
}

function rejectResponse({ code, message, status }: TradeRejection) {
  return NextResponse.json({ code, message }, { status });
}
