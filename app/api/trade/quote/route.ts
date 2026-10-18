/**
 * /api/trade/quote
 *
 * POST  — validates a trade request and returns a server-side preview
 *         (estimates + expiry) before any execution happens.
 * GET   — re-checks a previously issued quote by `quoteId`; returns 410 once
 *         the quote has expired so the client can request a fresh one.
 *
 * Stub: reference prices, fees and the quote store are in-memory placeholders.
 * Replace `REFERENCE_PRICES` with a Horizon/Soroban RPC lookup and the
 * `quotes` map with a shared store (e.g. Redis) before production use.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SUPPORTED_ASSETS = ["XLM", "USDC"] as const;
const SUPPORTED_NETWORKS = ["testnet", "pubnet"] as const;
const QUOTE_TTL_MS = 30_000;
const FEE_RATE = 0.001; // 10 bps
const SLIPPAGE_BPS = 50;

// Reference price of each asset in USDC. Missing entry => market unavailable.
const REFERENCE_PRICES: Partial<Record<(typeof SUPPORTED_ASSETS)[number], number>> = {
  XLM: 0.12,
  USDC: 1,
};

// Stellar public keys: "G" + 55 base32 characters
const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;

const quoteRequestSchema = z.object({
  asset: z.enum(SUPPORTED_ASSETS),
  direction: z.enum(["BUY", "SELL"]),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a positive number with up to 7 decimals")
    .refine((v) => Number(v) > 0, "Amount must be greater than 0"),
  wallet: z.string().trim().regex(STELLAR_ADDRESS, "Wallet must be a valid Stellar address"),
  network: z.enum(SUPPORTED_NETWORKS),
});

type Quote = z.infer<typeof quoteRequestSchema> & {
  quoteId: string;
  price: number;
  total: number;
  fee: number;
  slippageBps: number;
  expiresAt: number;
};

const quotes = new Map<string, Quote>();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid trade request",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const request = parsed.data;
  const price = REFERENCE_PRICES[request.asset];

  if (price === undefined) {
    return NextResponse.json(
      { error: `No market available for ${request.asset} right now` },
      { status: 503 }
    );
  }

  const quantity = Number(request.amount);
  const total = quantity * price;
  const quote: Quote = {
    ...request,
    quoteId: crypto.randomUUID(),
    price,
    total,
    fee: total * FEE_RATE,
    slippageBps: SLIPPAGE_BPS,
    expiresAt: Date.now() + QUOTE_TTL_MS,
  };
  quotes.set(quote.quoteId, quote);

  return NextResponse.json(toResponse(quote), { status: 200 });
}

export async function GET(req: NextRequest) {
  const quoteId = req.nextUrl.searchParams.get("quoteId");

  if (!quoteId) {
    return NextResponse.json({ error: "Missing quoteId parameter" }, { status: 400 });
  }

  const quote = quotes.get(quoteId);

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (Date.now() >= quote.expiresAt) {
    quotes.delete(quoteId);
    return NextResponse.json(
      { error: "Quote has expired", status: "expired" },
      { status: 410 }
    );
  }

  return NextResponse.json(toResponse(quote), { status: 200 });
}

function toResponse(quote: Quote) {
  return {
    quoteId: quote.quoteId,
    status: "valid",
    asset: quote.asset,
    direction: quote.direction,
    amount: quote.amount,
    wallet: quote.wallet,
    network: quote.network,
    estimates: {
      price: quote.price,
      total: quote.total,
      fee: quote.fee,
      slippageBps: quote.slippageBps,
    },
    expiresAt: new Date(quote.expiresAt).toISOString(),
  };
}
