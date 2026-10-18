"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { usePrivacyStore, PRIVACY_MASK } from "@/store/usePrivacyStore";
import { PortfolioEmptyState } from "@/components/PortfolioEmptyState";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { PortfolioAllocationChartSkeleton } from "@/components/DashboardWidgetSkeletons";
import { useChartColors } from "@/lib/chartPalette";
import { ChartPatternDefs } from "@/components/chart/ChartPatternDefs";
import { useTargetAllocationStore } from "@/store/useTargetAllocationStore";

interface PortfolioAllocationChartProps {
  className?: string;
  width?: number;
  height?: number;
}

export function PortfolioAllocationChart({
  className,
  width = 200,
  height = 200,
}: PortfolioAllocationChartProps) {
  const { assets, totalValue, isLoading } = usePortfolioStore();
  const { privacyMode } = usePrivacyStore();
  const { targets, overlayVisible } = useTargetAllocationStore();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const mask = (v: string) => (privacyMode ? PRIVACY_MASK : v);

  // Keep the selection in sync when the underlying data updates — clear it if
  // the selected asset disappears, otherwise the panel always reflects the
  // latest value for the still-selected symbol.
  useEffect(() => {
    if (selectedSymbol && !assets.some((a) => a.symbol === selectedSymbol)) {
      setSelectedSymbol(null);
    }
  }, [assets, selectedSymbol]);

  const chartColors = useChartColors();

  const chartData = useMemo(() => {
    return assets.map((asset, index) => ({
      ...asset,
      color: chartColors.series(index, asset.color),
      percentage: asset.percentage,
      pattern: chartColors.pattern(index),
    }));
  }, [assets, chartColors]);

  const selectedAsset = useMemo(
    () => chartData.find((a) => a.symbol === selectedSymbol) ?? null,
    [chartData, selectedSymbol]
  );

  const toggleSelection = (symbol: string) => {
    setSelectedSymbol((current) => (current === symbol ? null : symbol));
  };

  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  const arcs = useMemo(() => {
    if (chartData.length === 0) return [];

    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 10;
    const innerRadius = outerRadius * 0.4;

    let cumulativeAngle = 0;

    return chartData.map((asset) => {
      const angle = (asset.percentage / 100) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      const midAngle = startAngle + angle / 2;

      const startX =
        centerX + outerRadius * Math.cos(((startAngle - 90) * Math.PI) / 180);
      const startY =
        centerY + outerRadius * Math.sin(((startAngle - 90) * Math.PI) / 180);
      const endX =
        centerX + outerRadius * Math.cos(((endAngle - 90) * Math.PI) / 180);
      const endY =
        centerY + outerRadius * Math.sin(((endAngle - 90) * Math.PI) / 180);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const path = [
        `M ${startX} ${startY}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      ];

      const innerEndX =
        centerX + innerRadius * Math.cos(((endAngle - 90) * Math.PI) / 180);
      const innerEndY =
        centerY + innerRadius * Math.sin(((endAngle - 90) * Math.PI) / 180);
      const innerStartX =
        centerX + innerRadius * Math.cos(((startAngle - 90) * Math.PI) / 180);
      const innerStartY =
        centerY + innerRadius * Math.sin(((startAngle - 90) * Math.PI) / 180);

      path.push(`L ${innerEndX} ${innerEndY}`);
      path.push(
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}`
      );
      path.push("Z");

      // Position label at the middle of the arc
      const labelRadius = (outerRadius + innerRadius) / 2;
      const labelX =
        centerX + labelRadius * Math.cos(((midAngle - 90) * Math.PI) / 180);
      const labelY =
        centerY + labelRadius * Math.sin(((midAngle - 90) * Math.PI) / 180);

      cumulativeAngle = endAngle;

      return {
        path: path.join(" "),
        color: asset.color,
        percentage: asset.percentage,
        symbol: asset.symbol,
        name: asset.name,
        value: asset.value,
        pattern: asset.pattern,
        labelX,
        labelY,
      };
    });
  }, [chartData, width, height]);

  if (isLoading) {
    return <PortfolioAllocationChartSkeleton className={className} />;
  }

  if (assets.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">
            Portfolio Allocation
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <PortfolioEmptyState variant="allocation" />
        </CardContent>
      </Card>
    );
  }

  const activeArc = arcs.find((a) => a.symbol === activeSegment);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <h2 className="text-base font-semibold text-foreground">
          Portfolio Allocation
        </h2>
        <p className="text-xs text-muted-foreground">
          Total value: {mask(`$${totalValue.toLocaleString()}`)}
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="relative h-48 sm:h-56">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Portfolio allocation donut chart. ${arcs.map((a) => `${a.name} ${a.percentage.toFixed(1)}% (${a.pattern.label})`).join(", ")}`}
          >
            <ChartPatternDefs />
            {arcs.map((arc) => {
              const isSelected = selectedSymbol === arc.symbol;
              const isActive = activeSegment === arc.symbol;
              return (
                <g
                  key={arc.symbol}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${arc.name}, ${arc.percentage.toFixed(1)} percent, ${arc.pattern.label}. ${
                    isSelected ? "Selected. Press to deselect." : "Press to inspect."
                  }`}
                  onClick={() => toggleSelection(arc.symbol)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSelection(arc.symbol);
                    }
                  }}
                  onPointerEnter={() => setActiveSegment(arc.symbol)}
                  onPointerLeave={() => setActiveSegment(null)}
                  onTouchStart={(e) => { e.preventDefault(); setActiveSegment(arc.symbol); }}
                  onTouchEnd={() => setActiveSegment(null)}
                  onFocus={() => setActiveSegment(arc.symbol)}
                  onBlur={() => setActiveSegment(null)}
                  className="cursor-pointer outline-none focus-visible:opacity-90"
                  style={{ outline: "none" }}
                >
                  {/* Base color fill */}
                  <path
                    d={arc.path}
                    fill={arc.color}
                    stroke={isSelected ? "white" : "none"}
                    strokeWidth={isSelected ? 2 : 0}
                    className="transition-opacity hover:opacity-80"
                    opacity={activeSegment === null || isActive ? 1 : 0.5}
                    style={isActive ? { filter: "brightness(1.15)" } : undefined}
                  />
                  {/* Pattern overlay for non-color differentiation */}
                  {arc.pattern.patternId && (
                    <path
                      d={arc.path}
                      fill={`url(#${arc.pattern.patternId})`}
                      stroke="none"
                      pointerEvents="none"
                      opacity={activeSegment === null || isActive ? 1 : 0.5}
                    />
                  )}
                  {arc.percentage > 5 && (
                    <text
                      x={arc.labelX}
                      y={arc.labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white text-xs font-medium"
                      style={{ fontSize: "10px", pointerEvents: "none" }}
                    >
                      {`${arc.percentage.toFixed(0)}%`}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Target allocation band overlay (#798) — tick marks at target angle */}
            {overlayVisible && arcs.map((arc) => {
              const targetPct = targets[arc.symbol];
              if (targetPct === undefined) return null;

              const centerX = width / 2;
              const centerY = height / 2;
              const outerRadius = Math.min(width, height) / 2 - 10;
              const innerRadius = outerRadius * 0.4;

              // Accumulate to the arc's start angle then add target offset
              const arcIndex = arcs.indexOf(arc);
              const startAngleDeg = arcs
                .slice(0, arcIndex)
                .reduce((sum, a) => sum + (a.percentage / 100) * 360, 0);
              const targetAngleDeg = startAngleDeg + (targetPct / 100) * 360;
              const rad = ((targetAngleDeg - 90) * Math.PI) / 180;

              const x1 = centerX + (innerRadius - 4) * Math.cos(rad);
              const y1 = centerY + (innerRadius - 4) * Math.sin(rad);
              const x2 = centerX + (outerRadius + 4) * Math.cos(rad);
              const y2 = centerY + (outerRadius + 4) * Math.sin(rad);

              return (
                <g
                  key={`target-${arc.symbol}`}
                  aria-label={`Target for ${arc.name}: ${targetPct.toFixed(1)}%`}
                  role="img"
                  pointerEvents="none"
                >
                  {/* Dashed tick line */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="white"
                    strokeWidth={2}
                    strokeDasharray="3 2"
                    opacity={0.85}
                  />
                  {/* Small diamond at outer tip */}
                  <circle
                    cx={x2}
                    cy={y2}
                    r={3}
                    fill="white"
                    opacity={0.9}
                  />
                </g>
              );
            })}
          </svg>

          {/* Floating tooltip for the hovered/focused segment */}
          {activeArc && (
            <div
              role="tooltip"
              aria-live="polite"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="rounded-lg bg-slate-900/90 px-3 py-2 text-center shadow-lg">
                <p className="text-xs font-semibold text-white">{activeArc.name}</p>
                <p className="text-xs text-slate-300">{activeArc.percentage.toFixed(1)}%</p>
                {activeArc.value !== undefined && (
                  <p className="text-xs text-slate-400">{mask(`$${activeArc.value.toLocaleString()}`)}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Persistent detail panel for the clicked/selected asset */}
        {selectedAsset && (
          <div
            role="region"
            aria-label={`${selectedAsset.name} details`}
            className="mt-4 rounded-lg border border-border bg-surface p-3"
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelectedSymbol(null);
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: selectedAsset.color }}
                  aria-hidden="true"
                />
                <p className="font-semibold text-foreground">
                  {selectedAsset.name} ({selectedAsset.symbol})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSymbol(null)}
                aria-label={`Close ${selectedAsset.name} details`}
                className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X size={14} />
              </button>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Allocation</dt>
              <dd className="text-right font-mono text-foreground">
                {selectedAsset.percentage.toFixed(1)}%
              </dd>
              <dt className="text-muted-foreground">Value</dt>
              <dd className="text-right font-mono text-foreground">
                {mask(`$${selectedAsset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
              </dd>
              {typeof selectedAsset.unrealizedPnL === "number" && (
                <>
                  <dt className="text-muted-foreground">Unrealized P/L</dt>
                  <dd
                    className={cn(
                      "text-right font-mono",
                      selectedAsset.unrealizedPnL >= 0 ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {mask(`${selectedAsset.unrealizedPnL >= 0 ? "+" : ""}${selectedAsset.unrealizedPnL.toFixed(2)}`)}
                  </dd>
                </>
              )}
            </dl>

            {/* Token drilldown — constituent assets (#797) */}
            {selectedAsset.constituents && selectedAsset.constituents.length > 0 ? (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                  {selectedAsset.name} constituents
                </p>
                <ul
                  aria-label={`Constituent tokens of ${selectedAsset.name}`}
                  className="space-y-1"
                >
                  {selectedAsset.constituents.map((token) => (
                    <li
                      key={token.symbol}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">
                        {token.name}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({token.symbol})
                        </span>
                      </span>
                      <span className="font-mono text-foreground text-xs">
                        {mask(
                          `$${token.value.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        )}{" "}
                        <span className="text-muted-foreground">
                          ({token.percentage.toFixed(1)}%)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : selectedAsset.constituents && selectedAsset.constituents.length === 0 ? (
              <div className="mt-3 border-t border-border pt-3">
                <p
                  className="text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  No constituent assets for this segment.
                </p>
              </div>
            ) : null}
          </div>
        )}

        <ul className="mt-4 space-y-2" aria-label="Portfolio allocation breakdown">
          {chartData.map((asset) => {
            const targetPct = targets[asset.symbol];
            const showTarget = overlayVisible && targetPct !== undefined;
            const diff = showTarget ? asset.percentage - targetPct : null;
            return (
              <li key={asset.symbol}>
                <button
                  type="button"
                  onClick={() => toggleSelection(asset.symbol)}
                  aria-pressed={selectedSymbol === asset.symbol}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-1 py-0.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500",
                    selectedSymbol === asset.symbol ? "bg-white/5" : "hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: asset.color }}
                      aria-hidden="true"
                    />
                    <span className="text-foreground">{asset.name}</span>
                    <span className="sr-only">({asset.pattern.label})</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-foreground-muted text-xs">
                    <span aria-label={`Actual: ${asset.percentage.toFixed(1)} percent`}>
                      {asset.percentage.toFixed(1)}%
                    </span>
                    {showTarget && (
                      <>
                        <span className="text-muted-foreground" aria-hidden="true">
                          /
                        </span>
                        <span
                          className="text-muted-foreground"
                          aria-label={`Target: ${targetPct.toFixed(1)} percent`}
                        >
                          {targetPct.toFixed(1)}%
                        </span>
                        {diff !== null && (
                          <span
                            className={cn(
                              diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-muted-foreground"
                            )}
                            aria-label={`Difference from target: ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} percent`}
                          >
                            {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
