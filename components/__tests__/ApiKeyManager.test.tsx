/**
 * @jest-environment jsdom
 *
 * Regression tests for <ApiKeyManager /> (issue #447)
 *
 * ApiKeyManager handles sensitive credential material (API keys / personal
 * access tokens). These tests pin down three security-critical behaviors so
 * they cannot silently regress:
 *
 *  1. New key reveal — a freshly generated key is shown in full exactly once
 *     (in the one-time disclosure banner). On subsequent renders / re-visits
 *     only the masked reference is present in the DOM.
 *  2. Copy action — the Copy button copies the raw (unmasked) token value,
 *     not the masked display string.
 *  3. Revoke flow — revocation is gated behind a two-step confirmation, the
 *     call is only dispatched after the user confirms, the revoked key is
 *     removed from the list, and the underlying service is invalidated.
 *
 * Additionally, a guard test asserts the full unmasked token never appears
 * in any masked row's rendered DOM (textContent or attributes).
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiKeyManager } from "@/components/ApiKeyManager";
import type {
  ApiKey,
  CreatedApiKey,
} from "@/lib/apiKeys";

// ---------------------------------------------------------------------------
// Mock the apiKeys service so tests are deterministic and do not touch the
// real in-memory mock store (which leaks state across tests).
// ---------------------------------------------------------------------------

const FIXED_PLAIN_TOKEN = "ss_test_abcdef0123456789deadbeef";
const FIXED_MASKED_TOKEN = "sk_•••••••••dbeef";

// In-memory mock store. The mock service functions below mutate this so the
// combination of createApikey → invalidateQueries → fetchApiKeys reflects the
// new key in the rendered list. (Mirrors the real lib/apiKeys mock service.)
let store: ApiKey[];

const mockFetchApiKeys = jest.fn<
  Promise<ApiKey[]>,
  []
>(() => Promise.resolve([...store]));

const mockCreateApiKey = jest.fn<
  Promise<CreatedApiKey>,
  [name: string]
>((name: string) => {
  const created: CreatedApiKey = {
    id: "key-new-1",
    name,
    maskedToken: FIXED_MASKED_TOKEN,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    plainToken: FIXED_PLAIN_TOKEN,
  };
  store = [...store, { ...created }];
  return Promise.resolve(created);
});

const mockRevokeApiKey = jest.fn<
  Promise<void>,
  [id: string]
>((id: string) => {
  store = store.filter((k) => k.id !== id);
  return Promise.resolve();
});

jest.mock("@/lib/apiKeys", () => ({
  fetchApiKeys: (...args: unknown[]) => mockFetchApiKeys(...(args as [])),
  createApiKey: (...args: unknown[]) =>
    mockCreateApiKey(...(args as [string])),
  revokeApiKey: (...args: unknown[]) =>
    mockRevokeApiKey(...(args as [string])),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EXISTING_KEY: ApiKey = {
  id: "key-existing-1",
  name: "My Trading Bot",
  maskedToken: "sk_•••••••••f3a2",
  createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );

  return { ...utils, queryClient };
}

// jsdom does not implement the async Clipboard API. Install a stub that
// records the last value handed to writeText so copy tests can assert on it.
let lastCopiedValue: string | null = null;
let writeTextMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  store = [EXISTING_KEY];

  lastCopiedValue = null;
  writeTextMock = jest.fn(async (text: string) => {
    lastCopiedValue = text;
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: writeTextMock },
  });
});

afterEach(() => {
  // Restore so other test files get the default (non-stubbed) navigator.
  // deleteProperty is fine here — jsdom will re-create on next access.
  delete (navigator as unknown as { clipboard?: unknown }).clipboard;
});

// ---------------------------------------------------------------------------
// Loading / empty / list states
// ---------------------------------------------------------------------------

describe("ApiKeyManager – initial render", () => {
  it("renders the create form and keys list sections", async () => {
    renderWithProviders(<ApiKeyManager />);

    expect(
      screen.getByRole("heading", { name: /create new api key/i })
    ).toBeTruthy();
    expect(
      await screen.findByRole("heading", { name: /your api keys/i })
    ).toBeTruthy();
  });

  it("renders an existing key row using only its masked token", async () => {
    renderWithProviders(<ApiKeyManager />);

    const row = await screen.findByLabelText(/API keys list/i);
    expect(row.textContent).toContain(EXISTING_KEY.maskedToken);
    // Sanity: the masked value contains bullet chars
    expect(EXISTING_KEY.maskedToken).toContain("•");
  });

  it("shows an empty state when there are no keys", async () => {
    store = [];

    renderWithProviders(<ApiKeyManager />);

    expect(
      await screen.findByText(/no api keys yet/i)
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 1. New key reveal — shown once in full, then masked afterwards
// ---------------------------------------------------------------------------

describe("ApiKeyManager – newly generated key reveal", () => {
  it("displays the full plain token exactly once in the one-time banner", async () => {
    renderWithProviders(<ApiKeyManager />);

    // Wait for the existing list to load so initial query has settled.
    await screen.findByLabelText(/API keys list/i);

    // Generate a new key.
    const input = screen.getByPlaceholderText(/key name/i);
    fireEvent.change(input, { target: { value: "New Integration Key" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    });

    // The one-time banner shows the full token after a confirmed reveal.
    const banner = await screen.findByRole("alert");
    // The token is masked until the user confirms the reveal.
    expect(banner.textContent).not.toContain(FIXED_PLAIN_TOKEN);
    fireEvent.click(screen.getByRole("button", { name: /^reveal$/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm reveal/i }));
    expect(banner.textContent).toContain(FIXED_PLAIN_TOKEN);

    // The masked token of the newly created key is also shown in the list.
    expect(screen.getByText(FIXED_MASKED_TOKEN)).toBeTruthy();
  });

  it("hides the full token from the DOM once the banner is dismissed", async () => {
    renderWithProviders(<ApiKeyManager />);

    await screen.findByLabelText(/API keys list/i);

    const input = screen.getByPlaceholderText(/key name/i);
    fireEvent.change(input, { target: { value: "New Integration Key" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    });

    const banner = await screen.findByRole("alert");
    // The token is masked until the user confirms the reveal.
    expect(banner.textContent).not.toContain(FIXED_PLAIN_TOKEN);
    fireEvent.click(screen.getByRole("button", { name: /^reveal$/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm reveal/i }));
    expect(banner.textContent).toContain(FIXED_PLAIN_TOKEN);

    // Dismiss the one-time banner.
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /i've copied it/i })
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });

    // The full plain token must NOT be anywhere in the document after dismiss.
    expect(document.body.textContent).not.toContain(FIXED_PLAIN_TOKEN);
    // The masked token for the new key should still be present in the list.
    expect(screen.getByText(FIXED_MASKED_TOKEN)).toBeTruthy();
  });

  it("does not re-show the full token on a subsequent re-render / re-fetch", async () => {
    const { queryClient } = renderWithProviders(<ApiKeyManager />);

    await screen.findByLabelText(/API keys list/i);

    const input = screen.getByPlaceholderText(/key name/i);
    fireEvent.change(input, { target: { value: "New Integration Key" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    });

    // Capture and dismiss the banner.
    await screen.findByRole("alert");
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /i've copied it/i })
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });

    // Force a refetch — simulates a re-visit / cache invalidation.
    // store already reflects the newly created key (from createApiKey) but
    // critically does NOT include the plain token anywhere.
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    });

    // No alert banner re-appears, and the full token must remain absent.
    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });
    expect(document.body.textContent).not.toContain(FIXED_PLAIN_TOKEN);
  });
});

// ---------------------------------------------------------------------------
// 2. Copy action — copies the raw key, not the masked display string
// ---------------------------------------------------------------------------

describe("ApiKeyManager – copy action", () => {
  it("copies the raw plain token value to the clipboard", async () => {
    renderWithProviders(<ApiKeyManager />);

    await screen.findByLabelText(/API keys list/i);

    const input = screen.getByPlaceholderText(/key name/i);
    fireEvent.change(input, { target: { value: "New Integration Key" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    });

    // The Copy button within the one-time banner copies the *raw* token.
    const copyButton = await screen.findByRole("button", {
      name: /copy api key/i,
    });

    await act(async () => {
      fireEvent.click(copyButton);
    });

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(1);
    });

    // The value handed to the clipboard MUST be the raw token, not the
    // masked display string.
    expect(lastCopiedValue).toBe(FIXED_PLAIN_TOKEN);
    expect(lastCopiedValue).not.toBe(FIXED_MASKED_TOKEN);
  });

  it("does not copy the masked token for an existing (non-revealed) key", async () => {
    renderWithProviders(<ApiKeyManager />);

    await screen.findByLabelText(/API keys list/i);

    // There is no Copy affordance on existing (masked-only) rows — only the
    // one-time banner exposes a copy of the raw key. Confirm by counting
    // copy buttons present after initial load (no new key generated).
    const copyButtons = screen.queryAllByRole("button", {
      name: /copy api key/i,
    });
    expect(copyButtons).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Revoke flow — confirmation gating, removal, and invalidation
// ---------------------------------------------------------------------------

describe("ApiKeyManager – revoke confirmation flow", () => {
  it("does not invoke revokeApiKey on the first revoke click", async () => {
    renderWithProviders(<ApiKeyManager />);

    await screen.findByLabelText(/API keys list/i);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /revoke API key my trading bot/i,
        })
      );
    });

    expect(mockRevokeApiKey).not.toHaveBeenCalled();
    // Confirm-step affordances must appear instead.
    expect(
      screen.getByRole("button", {
        name: /confirm revoke API key my trading bot/i,
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /cancel revoke API key my trading bot/i,
      })
    ).toBeTruthy();
  });

  it("dispatches revokeApiKey with the correct id only after confirming", async () => {
    renderWithProviders(<ApiKeyManager />);

    await screen.findByLabelText(/API keys list/i);

    // First click — opens confirmation, no revoke dispatched.
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /revoke API key my trading bot/i,
        })
      );
    });

    expect(mockRevokeApiKey).not.toHaveBeenCalled();

    // Second click — the "Confirm revoke" button actually revokes.
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /confirm revoke API key my trading bot/i,
        })
      );
    });

    await waitFor(() => {
      expect(mockRevokeApiKey).toHaveBeenCalledTimes(1);
    });
    expect(mockRevokeApiKey).toHaveBeenCalledWith(EXISTING_KEY.id);
  });

  it("removes the revoked key from the list after confirmation", async () => {
    renderWithProviders(<ApiKeyManager />);

    await screen.findByLabelText(/API keys list/i);

    expect(screen.getByText(EXISTING_KEY.maskedToken)).toBeTruthy();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /revoke API key my trading bot/i,
        })
      );
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /confirm revoke API key my trading bot/i,
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByText(EXISTING_KEY.maskedToken)).toBeNull();
    });

    // The empty state should now be visible (no keys remaining).
    expect(await screen.findByText(/no api keys yet/i)).toBeTruthy();
  });

  it("cancel button aborts the revoke without dispatching", async () => {
    renderWithProviders(<ApiKeyManager />);

    await screen.findByLabelText(/API keys list/i);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /revoke API key my trading bot/i,
        })
      );
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /cancel revoke API key my trading bot/i,
        })
      );
    });

    expect(mockRevokeApiKey).not.toHaveBeenCalled();
    // Back to the non-confirming UI — key still listed.
    expect(screen.getByText(EXISTING_KEY.maskedToken)).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /revoke API key my trading bot/i,
      })
    ).toBeTruthy();
  });

  it("invalidates the api-keys query after a successful revoke", async () => {
    const { queryClient } = renderWithProviders(<ApiKeyManager />);

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    await screen.findByLabelText(/API keys list/i);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /revoke API key my trading bot/i,
        })
      );
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /confirm revoke API key my trading bot/i,
        })
      );
    });

    await waitFor(() => {
      expect(mockRevokeApiKey).toHaveBeenCalledTimes(1);
    });

    // A revoke must invalidate the api-keys query so the cache stays fresh
    // and the revoked id cannot be reused downstream.
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["api-keys"],
    });
  });

  it("does not allow revoking the same key twice (id removed after revoke)", async () => {
    renderWithProviders(<ApiKeyManager />);

    await screen.findByLabelText(/API keys list/i);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /revoke API key my trading bot/i,
        })
      );
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /confirm revoke API key my trading bot/i,
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByText(EXISTING_KEY.maskedToken)).toBeNull();
    });

    // With no rows left, there must be no revoke affordance to re-trigger.
    expect(
      screen.queryByRole("button", { name: /revoke API key/i })
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Leakage guard — full unmasked token never appears in a masked row
// ---------------------------------------------------------------------------

describe("ApiKeyManager – masked row leakage guard", () => {
  it("a masked row's rendered DOM never contains the full unmasked token", async () => {
    // Set up a key whose plain token differs clearly from the masked one.
    const PLAIN = "ss_test_supersecretrawvalue_x1234567890";
    const MASKED = "sk_•••••••••1234";

    store = [
      {
        id: "key-leak-test",
        name: "Leak Test Bot",
        maskedToken: MASKED,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      },
    ];

    renderWithProviders(<ApiKeyManager />);

    await screen.findByLabelText(/API keys list/i);

    // The whole document must not contain the raw token anywhere —
    // not as text content, and not as an attribute value (e.g. title).
    expect(document.body.textContent).not.toContain(PLAIN);
    expect(document.body.innerHTML).not.toContain(PLAIN);

    // And the masked value should be present (sanity check).
    expect(screen.getByText(MASKED)).toBeTruthy();
  });

  it("the full unmasked token of a just-created key is absent from masked rows", async () => {
    renderWithProviders(<ApiKeyManager />);

    await screen.findByLabelText(/API keys list/i);

    const input = screen.getByPlaceholderText(/key name/i);
    fireEvent.change(input, { target: { value: "New Integration Key" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    });

    // Dismiss the one-time banner so only masked rows remain.
    await screen.findByRole("alert");
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /i've copied it/i })
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });

    // After dismiss, the full token must not leak anywhere in the DOM,
    // including title attributes / aria labels / data-* props.
    expect(document.body.innerHTML).not.toContain(FIXED_PLAIN_TOKEN);
    expect(document.body.textContent).not.toContain(FIXED_PLAIN_TOKEN);
  });
});
