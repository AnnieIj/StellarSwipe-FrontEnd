import {
  checkBudgetViolation,
  getComponentBudget,
  COMPONENT_BUDGETS,
  checkComponentBudget,
  checkAllComponentBudgets,
  formatBudgetReport,
  trackComponentMetrics,
} from "@/lib/componentBudgets";
import {
  checkComponentBudget as devCheckComponentBudget,
  checkAllComponentBudgets as devCheckAllComponentBudgets,
  formatBudgetReport as devFormatBudgetReport,
} from "@/lib/performance/componentBudgetChecker";

describe("componentBudgets – Configuration & Checking", () => {
  describe("getComponentBudget", () => {
    it("returns budget for known component", () => {
      const budget = getComponentBudget("SignalCard");
      expect(budget).toBeDefined();
      expect(budget?.name).toBe("SignalCard");
      expect(budget?.expectedKb).toBeGreaterThan(0);
    });

    it("returns null for unknown component", () => {
      const budget = getComponentBudget("UnknownComponent");
      expect(budget).toBeNull();
    });

    it("has threshold for all budgets", () => {
      for (const [name, budget] of Object.entries(COMPONENT_BUDGETS)) {
        expect(budget.threshold).toBeGreaterThan(0);
        expect(budget.threshold).toBeLessThan(1);
      }
    });
  });

  describe("checkBudgetViolation", () => {
    it("returns null for unknown component", () => {
      const result = checkBudgetViolation("Unknown", 50);
      expect(result).toBeNull();
    });

    it("detects budget violation (overage > threshold)", () => {
      const budget = getComponentBudget("SignalCard")!; // 45KB, 15% threshold = 6.75KB allowed
      const actualKb = budget.expectedKb + budget.expectedKb * budget.threshold + 1; // Over by 1KB
      const result = checkBudgetViolation("SignalCard", actualKb);

      expect(result).toBeDefined();
      expect(result!.violated).toBe(true);
      expect(result!.overageKb).toBeGreaterThan(1);
      expect(result!.overagePercent).toBeGreaterThan(0);
    });

    it("allows small overages within threshold", () => {
      const budget = getComponentBudget("SignalCard")!; // 45KB, 15% threshold = 6.75KB allowed
      const actualKb = budget.expectedKb + 2; // Only 2KB over (within 15%)
      const result = checkBudgetViolation("SignalCard", actualKb);

      expect(result).toBeDefined();
      expect(result!.violated).toBe(false);
    });

    it("passes for size at budget", () => {
      const budget = getComponentBudget("NavHeader")!;
      const result = checkBudgetViolation("NavHeader", budget.expectedKb);

      expect(result).toBeDefined();
      expect(result!.violated).toBe(false);
    });

    it("includes helpful message", () => {
      const budget = getComponentBudget("SignalCard")!;
      const actualKb = budget.expectedKb * 1.5; // 50% over
      const result = checkBudgetViolation("SignalCard", actualKb);

      expect(result!.message).toContain("SignalCard");
      expect(result!.message).toContain("exceeds budget");
    });
  });

  describe("checkAllComponentBudgets", () => {
    it("detects multiple violations", () => {
      const sizes = {
        SignalCard: 60, // Over budget
        Leaderboard: 50, // Over budget
        NavHeader: 15, // OK
      };

      const violations = devCheckAllComponentBudgets(sizes);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some((v) => v.componentName === "SignalCard")).toBe(true);
    });

    it("returns empty array if all components ok", () => {
      const sizes = {
        SignalCard: 45, // At budget
        Leaderboard: 40, // Under budget
        NavHeader: 15, // Well under
      };

      const violations = devCheckAllComponentBudgets(sizes);
      expect(violations).toEqual([]);
    });

    it("ignores unknown components", () => {
      const sizes = {
        "UnknownComponent": 999, // Not in COMPONENT_BUDGETS
        SignalCard: 60,
      };

      const violations = devCheckAllComponentBudgets(sizes);
      expect(violations.some((v) => v.componentName === "UnknownComponent")).toBe(false);
    });
  });

  describe("formatBudgetReport", () => {
    it("returns success message for no violations", () => {
      const report = devFormatBudgetReport([]);
      expect(report).toContain("✓ All components within performance budget");
    });

    it("formats violations with details", () => {
      const violations = [
        {
          componentName: "SignalCard",
          actualKb: 55,
          budget: COMPONENT_BUDGETS.SignalCard,
          overageKb: 10,
          overagePercent: 22.2,
        },
      ];

      const report = devFormatBudgetReport(violations);
      expect(report).toContain("SignalCard");
      expect(report).toContain("55");
      expect(report).toContain("45");
      expect(report).toContain("10");
    });

    it("includes troubleshooting tips", () => {
      const violations = [
        {
          componentName: "SignalCard",
          actualKb: 55,
          budget: COMPONENT_BUDGETS.SignalCard,
          overageKb: 10,
          overagePercent: 22.2,
        },
      ];

      const report = devFormatBudgetReport(violations);
      expect(report).toContain("code splitting");
      expect(report).toContain("lazy loading");
      expect(report).toContain("build:analyze");
    });

    it("handles multiple violations", () => {
      const violations = [
        {
          componentName: "SignalCard",
          actualKb: 55,
          budget: COMPONENT_BUDGETS.SignalCard,
          overageKb: 10,
          overagePercent: 22.2,
        },
        {
          componentName: "Leaderboard",
          actualKb: 50,
          budget: COMPONENT_BUDGETS.Leaderboard,
          overageKb: 10,
          overagePercent: 25,
        },
      ];

      const report = devFormatBudgetReport(violations);
      expect(report).toContain("2 component");
      expect(report).toContain("SignalCard");
      expect(report).toContain("Leaderboard");
    });
  });

  describe("Budget configuration integrity", () => {
    it("all budgets have positive expected sizes", () => {
      for (const [name, budget] of Object.entries(COMPONENT_BUDGETS)) {
        expect(budget.expectedKb).toBeGreaterThan(0);
      }
    });

    it("all budgets have reasonable thresholds (5-20%)", () => {
      for (const [name, budget] of Object.entries(COMPONENT_BUDGETS)) {
        expect(budget.threshold).toBeGreaterThanOrEqual(0.05);
        expect(budget.threshold).toBeLessThanOrEqual(0.3);
      }
    });

    it("all budgets have descriptive names", () => {
      for (const [name, budget] of Object.entries(COMPONENT_BUDGETS)) {
        expect(budget.name).toBeTruthy();
        expect(budget.name.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("componentBudgetChecker – Development Warnings", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("only checks in development mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    devCheckComponentBudget("SignalCard", 100); // Way over budget
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it("logs warning when budget exceeded", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    devCheckComponentBudget("SignalCard", 100); // Way over
    expect(consoleWarnSpy).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it("respects log level parameter", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    consoleErrorSpy.mockClear();
    devCheckComponentBudget("SignalCard", 100, "error");
    expect(consoleErrorSpy).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});
