import type { Metadata } from "next";
import { JournalPage } from "@/components/JournalPage";

export const metadata: Metadata = {
  title: "Trading Journal | StellarSwipe",
  description:
    "Manage your trading history and backfill entries via CSV import.",
};

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

function JournalRouteInner() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <JournalPage />
      </div>
    </main>
  );
}

export default function JournalRoute() {
  return (
    <RouteErrorBoundary featureName="Journal">
      <JournalRouteInner />
    </RouteErrorBoundary>
  );
}
