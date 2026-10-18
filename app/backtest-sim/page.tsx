"use client";

import dynamic from "next/dynamic";

const BacktestTool = dynamic(() => import("../../components/BacktestTool"), {
  loading: () => (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-8 bg-white/10 rounded w-48" />
      <div className="h-32 bg-white/10 rounded" />
    </div>
  ),
  ssr: false,
});

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { RouteBreadcrumb } from "@/components/RouteBreadcrumb";

function BacktestPageInner() {
  return (
    <div className="p-6">
      <RouteBreadcrumb />
      <h1 className="text-2xl font-bold mb-4">Signal Backtesting Simulation</h1>
      <BacktestTool />
    </div>
  );
}

export default function BacktestPage() {
  return (
    <RouteErrorBoundary featureName="Backtest Simulator">
      <BacktestPageInner />
    </RouteErrorBoundary>
  );
}
