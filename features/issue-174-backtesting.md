# Issue #174 - Signal Backtesting Simulation Tool

Planned frontend scaffold for backtesting simulation tool.

Acceptance coverage:

- Date range selector for historical data: UI placeholder in app/backtest-sim/page.tsx
- Choose multiple signals/providers: UI controls in components/BacktestTool.tsx
- Run simulation with historical prices: simulation runner stub in lib/backtest.ts
- Display simulated returns, win rate, drawdown analysis: results placeholder UI
- Comparison with buy-and-hold: results placeholder
- Export backtest report as CSV/PDF: export stub in BacktestTool
- Visual chart showing simulated trades: chart placeholder using canvas/svg
- Assumption transparency (fees, slippage): UI controls
- Save backtest scenarios for comparison: localStorage stub

Notes:

- This is a UI and logic scaffold; integration with historical price API and charting library is needed to run real backtests.
