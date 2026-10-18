import type { MetadataRoute } from "next";

function resolveSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  return env?.trim() || "http://localhost:3000";
}



// Public, static-ish routes to expose.
const STATIC_PUBLIC_PATHS: string[] = [
  "/",
  "/leaderboard",
  "/demo",
  "/recommendation-factors",
  "/referral",
  "/performance",
  "/backtest-sim",
  "/compare",
  "/tax-report",
  "/journal",
];

// Provider profiles are dynamic (/provider/[providerId]). In this codebase,
// provider data is currently mock-driven in client hooks, and there is no
// server-side provider registry available during sitemap generation.
// To keep sitemap valid and deterministic, we only include the known mock
// provider IDs.
const KNOWN_PROVIDER_IDS: string[] = ["provider-1"];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl();

  const entries: MetadataRoute.Sitemap = [
    ...STATIC_PUBLIC_PATHS.map((path) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: "weekly" as const,
      priority:
        path === "/" ? 1.0 : path === "/leaderboard" ? 0.9 : path === "/provider/" ? 0.7 : 0.7,
    })),
    ...KNOWN_PROVIDER_IDS.map((providerId) => ({
      url: `${siteUrl}/provider/${encodeURIComponent(providerId)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  return entries;
}
