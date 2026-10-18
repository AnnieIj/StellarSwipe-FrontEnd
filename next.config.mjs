import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

const isStorybook = process.argv.some((arg) => arg.includes("storybook"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  experimental: {
    instrumentationHook: !isStorybook,
  },
  images: {
    remotePatterns: [
      // Avatar images from any HTTPS source (leaderboard / provider profiles)
      { protocol: "https", hostname: "**" },
    ],
  },
};

const configWithBundleAnalyzer = withBundleAnalyzer(nextConfig);

export default isStorybook
  ? nextConfig
  : withSentryConfig(configWithBundleAnalyzer, {
      org: "your-org",
      project: "your-project",
      silent: true,
      widenClientFileUpload: true,
      webpack: {
        reactComponentAnnotation: { enabled: true },
        treeshake: { removeDebugLogging: true },
        automaticVercelMonitors: true,
      },
      hideSourceMaps: true,
    });
