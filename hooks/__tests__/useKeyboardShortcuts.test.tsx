/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { useKeyboardShortcuts, SEQUENCE_TIMEOUT_MS, type ShortcutConfig } from "@/hooks/useKeyboardShortcuts";

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) {
  fireEvent.keyDown(target, { key, ...init });
}

describe("useKeyboardShortcuts", () => {
  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = "";
  });

  it("fires single-key shortcuts such as ?", () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: "?", callback }]));

    press("?", { shiftKey: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires 'g then n' style sequences", () => {
    const callback = jest.fn();
    const shortcuts: ShortcutConfig[] = [{ key: "g then n", callback }];
    renderHook(() => useKeyboardShortcuts(shortcuts));

    press("g");
    expect(callback).not.toHaveBeenCalled();
    press("n");
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not complete a sequence after the timeout", () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    const shortcuts: ShortcutConfig[] = [{ key: "g then n", callback }];
    renderHook(() => useKeyboardShortcuts(shortcuts));

    press("g");
    jest.setSystemTime(Date.now() + SEQUENCE_TIMEOUT_MS + 1);
    press("n");
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not hijack browser shortcuts that use modifier keys", () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: "r", callback }]));

    press("r", { metaKey: true });
    press("r", { ctrlKey: true });
    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores keys typed into form fields", () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: "?", callback }]));

    const input = document.createElement("input");
    document.body.appendChild(input);
    press("?", {}, input);
    expect(callback).not.toHaveBeenCalled();
  });

  it("ignores keys while focus is inside a dialog", () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: "?", callback }]));

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const button = document.createElement("button");
    dialog.appendChild(button);
    document.body.appendChild(dialog);
    press("?", {}, button);
    expect(callback).not.toHaveBeenCalled();
  });
});
