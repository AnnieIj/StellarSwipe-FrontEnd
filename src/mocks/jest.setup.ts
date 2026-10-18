import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";
import { ReadableStream, TransformStream } from "node:stream/web";

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  ReadableStream,
  TransformStream,
  WritableStream:
    typeof WritableStream !== "undefined"
      ? WritableStream
      : require("stream/web").WritableStream,
  BroadcastChannel:
    typeof BroadcastChannel !== "undefined"
      ? BroadcastChannel
      : require("worker_threads").BroadcastChannel,
  MessagePort:
    typeof MessagePort !== "undefined"
      ? MessagePort
      : require("worker_threads").MessagePort,
  MessageChannel:
    typeof MessageChannel !== "undefined"
      ? MessageChannel
      : require("worker_threads").MessageChannel,
});

// Only polyfill if they don't exist natively (pre-Node-18 environments).
// Node 18+ has native fetch, Headers, Request, Response.
if (typeof fetch === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const undici = require("undici");
    Object.assign(globalThis, {
      fetch: undici.fetch,
      Headers: undici.Headers,
      Request: undici.Request,
      Response: undici.Response,
    });
  } catch {
    // undici not available — running on Node 18+ which has native fetch
  }
}

let server: {
  listen: (options: { onUnhandledRequest: "warn" }) => void;
  resetHandlers: () => void;
  close: () => void;
} | null = null;

try {
  server = require("./server").server;
} catch {
  server = null;
}

beforeAll(() => server?.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server?.resetHandlers());
afterAll(() => server?.close());
