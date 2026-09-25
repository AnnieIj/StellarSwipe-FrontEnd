import type { Config } from "jest";

const sharedConfig = {
  preset: "ts-jest",
  testEnvironment: "node" as const,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

const config: Config = {
  // Two projects:
  //   1. "unit" — pure TypeScript tests that do not need MSW (poller, tracing, etc.)
  //   2. "network" — tests that use MSW for HTTP mocking
  //
  // This split avoids the MSW ESM incompatibility surfacing in tests that
  // don't need network mocking at all.
  projects: [
    {
      ...sharedConfig,
      displayName: "unit",
      testMatch: [
        "<rootDir>/src/__tests__/**/*.test.ts",
        "<rootDir>/src/tracing/__tests__/**/*.test.ts",
        "<rootDir>/hooks/__tests__/**/*.test.ts",
        "<rootDir>/store/__tests__/**/*.test.ts",
        "<rootDir>/components/__tests__/**/*.test.{ts,tsx}",
        "<rootDir>/components/chart/__tests__/**/*.test.{ts,tsx}",
        "<rootDir>/services/performanceMonitoring/__tests__/**/*.test.ts",
      ],
      // No setupFilesAfterEnv — these tests never need MSW.
    },
    {
      ...sharedConfig,
      displayName: "network",
      testMatch: [
        "<rootDir>/lib/__tests__/**/*.test.ts",
      ],
      // MSW lifecycle for HTTP-mocked tests only.
      setupFilesAfterEnv: ["<rootDir>/src/mocks/jest.setup.ts"],
    },
  ],
};

export default config;
