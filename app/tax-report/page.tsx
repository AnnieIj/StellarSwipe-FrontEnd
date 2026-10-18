import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Tax Report | StellarSwipe",
  description:
    "Generate tax documents from your StellarSwipe trading activity.",
};

const TaxReportingTool = dynamic(
  () => import("@/components/TaxReportingTool").then((m) => m.TaxReportingTool),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-white/10 rounded w-48" />
        <div className="h-64 bg-white/10 rounded" />
      </div>
    ),
    ssr: false,
  }
);

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

function TaxReportPageInner() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-8 text-foreground">
      <div className="mx-auto w-full max-w-4xl">
        <TaxReportingTool />
      </div>
    </main>
  );
}

export default function TaxReportPage() {
  return (
    <RouteErrorBoundary featureName="Tax Report">
      <TaxReportPageInner />
    </RouteErrorBoundary>
  );
}
