import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@/lib/subscriptionStatus";

/**
 * POST /api/subscriptions/[id]/cancel
 * Cancels the given subscription.
 * Replace the stub with a real DB / Soroban contract call.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
  }

  // TODO: persist cancellation in your data source
  // e.g. await db.subscriptions.update({ id }, { status: SubscriptionStatus.Cancelled });

  return NextResponse.json(
    { id, status: SubscriptionStatus.Cancelled },
    { status: 200 }
  );
}
