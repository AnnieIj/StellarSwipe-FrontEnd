import { NextRequest, NextResponse } from "next/server";

// In production, persist subscriptions to a database keyed by user ID.
// This in-memory store is sufficient for demonstration/testing.
const pushSubscriptions = new Map<string, PushSubscriptionJSON>();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.endpoint) {
    return NextResponse.json(
      { error: "Invalid subscription" },
      { status: 400 }
    );
  }
  pushSubscriptions.set(body.endpoint, body);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }
  pushSubscriptions.delete(body.endpoint);
  return NextResponse.json({ ok: true }, { status: 200 });
}
