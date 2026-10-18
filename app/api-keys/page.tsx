"use client";

import { KeyRound } from "lucide-react";
import { ApiKeyManager } from "@/components/ApiKeyManager";

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

function ApiKeysPageInner() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-8 text-foreground">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Page header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <KeyRound size={20} className="text-blue-400" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-foreground">API Keys</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Personal access tokens for integrating third-party scripts and tools
            with your account. Distinct from{" "}
            <a
              href="/security"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              webhook subscriptions
            </a>{" "}
            (outbound event delivery).
          </p>
        </div>

        <ApiKeyManager />
      </div>
    </main>
  );
}

export default function ApiKeysPage() {
  return (
    <RouteErrorBoundary featureName="API Keys">
      <ApiKeysPageInner />
    </RouteErrorBoundary>
  );
}
