import { NextRequest, NextResponse } from "next/server";
import {
  parseSubscriptionStatus,
  SubscriptionStatus,
} from "@/lib/subscriptionStatus";

export async function GET(req: NextRequest) {
  const rawStatus = req.nextUrl.searchParams.get("status");

  if (rawStatus === null) {
    return NextResponse.json(
      { subscriptions: await fetchSubscriptions() },
      { status: 200 }
    );
  }

  const status = parseSubscriptionStatus(rawStatus);

  if (!status) {
    return NextResponse.json(
      {
        error: `Invalid status "${rawStatus}". Valid values: ${Object.values(
          SubscriptionStatus
        ).join(", ")}`,
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { subscriptions: await fetchSubscriptions(status) },
    { status: 200 }
  );
}

// Replace with real data source (DB / Soroban contract call)
async function fetchSubscriptions(status?: SubscriptionStatus) {
  const mock = [
    { id: "1", status: SubscriptionStatus.Active },
    { id: "2", status: SubscriptionStatus.Expired },
    { id: "3", status: SubscriptionStatus.Pending },
  ];
  return status ? mock.filter((s) => s.status === status) : mock;
}
