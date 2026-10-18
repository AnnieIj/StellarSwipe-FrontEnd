import { useBacktestPresetsStore } from "@/store/useBacktestPresetsStore";
import type { BacktestParams } from "@/lib/backtest";

const SAMPLE_PARAMS: BacktestParams = {
  from: "2023-01-01",
  to: "2023-12-31",
  signals: ["providerA", "signalX"],
  slippageBps: 10,
  feeBps: 15,
};

describe("useBacktestPresetsStore – saving presets", () => {
  beforeEach(() => {
    useBacktestPresetsStore.setState({ presets: [] });
  });

  it("starts with no presets", () => {
    expect(useBacktestPresetsStore.getState().presets).toHaveLength(0);
  });

  it("saves a preset under the given name", () => {
    useBacktestPresetsStore.getState().savePreset("My Strategy", SAMPLE_PARAMS);
    const { presets } = useBacktestPresetsStore.getState();
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe("My Strategy");
  });

  it("stores the full param set in the preset", () => {
    useBacktestPresetsStore.getState().savePreset("Q1 Run", SAMPLE_PARAMS);
    const { params } = useBacktestPresetsStore.getState().presets[0];
    expect(params.from).toBe("2023-01-01");
    expect(params.to).toBe("2023-12-31");
    expect(params.signals).toEqual(["providerA", "signalX"]);
    expect(params.slippageBps).toBe(10);
    expect(params.feeBps).toBe(15);
  });

  it("accumulates multiple presets", () => {
    useBacktestPresetsStore.getState().savePreset("First", SAMPLE_PARAMS);
    useBacktestPresetsStore
      .getState()
      .savePreset("Second", { ...SAMPLE_PARAMS, from: "2024-01-01" });
    expect(useBacktestPresetsStore.getState().presets).toHaveLength(2);
  });
});

describe("useBacktestPresetsStore – listing presets", () => {
  beforeEach(() => {
    useBacktestPresetsStore.setState({ presets: [] });
    useBacktestPresetsStore.getState().savePreset("Alpha", SAMPLE_PARAMS);
    useBacktestPresetsStore
      .getState()
      .savePreset("Beta", { ...SAMPLE_PARAMS, feeBps: 20 });
  });

  it("lists all saved presets", () => {
    const names = useBacktestPresetsStore.getState().presets.map((p) => p.name);
    expect(names).toContain("Alpha");
    expect(names).toContain("Beta");
  });

  it("each preset has a unique id", () => {
    const ids = useBacktestPresetsStore.getState().presets.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("useBacktestPresetsStore – reloading a preset", () => {
  beforeEach(() => {
    useBacktestPresetsStore.setState({ presets: [] });
    useBacktestPresetsStore.getState().savePreset("Reload Test", SAMPLE_PARAMS);
  });

  it("preset params can be retrieved by id for reloading into form", () => {
    const preset = useBacktestPresetsStore.getState().presets[0];
    expect(preset.params).toEqual(SAMPLE_PARAMS);
  });

  it("deletes a preset by id", () => {
    const { presets } = useBacktestPresetsStore.getState();
    const id = presets[0].id;
    useBacktestPresetsStore.getState().deletePreset(id);
    expect(useBacktestPresetsStore.getState().presets).toHaveLength(0);
  });

  it("only removes the targeted preset, leaving others intact", () => {
    useBacktestPresetsStore
      .getState()
      .savePreset("Keep This", { ...SAMPLE_PARAMS, feeBps: 99 });
    const all = useBacktestPresetsStore.getState().presets;
    const idToRemove = all[0].id;
    useBacktestPresetsStore.getState().deletePreset(idToRemove);
    const remaining = useBacktestPresetsStore.getState().presets;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe("Keep This");
  });
});
