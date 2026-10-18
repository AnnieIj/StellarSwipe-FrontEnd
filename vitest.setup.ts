import "@testing-library/jest-dom";

// Avoid noisy warnings from React 18 + Next Link in tests.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const message = args[0];
  if (typeof message === "string" && message.includes("not wrapped in act")) {
    return;
  }
  originalError(...args);
};
