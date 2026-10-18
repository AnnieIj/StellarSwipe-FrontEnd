"use client";

/**
 * ChartPatternDefs
 * ─────────────────
 * Renders an SVG <defs> block containing all named fill patterns used by
 * chart components for non-color series differentiation (#789).
 *
 * Embed once inside an <svg> element:
 *
 *   <svg …>
 *     <ChartPatternDefs />
 *     {/* chart paths that reference url(#pattern-dash) etc. *\/}
 *   </svg>
 *
 * Each pattern tiles a small motif at a consistent stroke weight so the
 * distinction stays legible at small sizes and in greyscale / print output.
 * The `color` prop is passed through to all strokes so patterns adapt to the
 * series color while remaining distinct.
 */

interface ChartPatternDefsProps {
  /** Stroke color applied to pattern lines. Defaults to currentColor. */
  color?: string;
  /** Stroke width for pattern lines. Defaults to 1. */
  strokeWidth?: number;
}

export function ChartPatternDefs({
  color = "currentColor",
  strokeWidth = 1,
}: ChartPatternDefsProps) {
  const sw = strokeWidth;

  return (
    <defs>
      {/* Diagonal stripe — used for "dashed" fill areas */}
      <pattern
        id="pattern-dash"
        x="0"
        y="0"
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line
          x1="0" y1="0" x2="0" y2="8"
          stroke={color}
          strokeWidth={sw * 2}
          strokeOpacity="0.55"
        />
      </pattern>

      {/* Small dots — used for "dotted" fill areas */}
      <pattern
        id="pattern-dot"
        x="0"
        y="0"
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
      >
        <circle cx="3" cy="3" r={sw * 1.2} fill={color} fillOpacity="0.6" />
      </pattern>

      {/* Alternating dash-dot stripe */}
      <pattern
        id="pattern-ddot"
        x="0"
        y="0"
        width="12"
        height="12"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line
          x1="0" y1="0" x2="0" y2="12"
          stroke={color}
          strokeWidth={sw * 2}
          strokeDasharray="5 2 1 2"
          strokeOpacity="0.55"
        />
      </pattern>

      {/* Long-dash stripe */}
      <pattern
        id="pattern-ldash"
        x="0"
        y="0"
        width="10"
        height="10"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line
          x1="0" y1="0" x2="0" y2="10"
          stroke={color}
          strokeWidth={sw * 2.5}
          strokeDasharray="6 2"
          strokeOpacity="0.5"
        />
      </pattern>

      {/* Sparse dot grid */}
      <pattern
        id="pattern-sparse"
        x="0"
        y="0"
        width="10"
        height="10"
        patternUnits="userSpaceOnUse"
      >
        <circle cx="5" cy="5" r={sw * 1.5} fill={color} fillOpacity="0.45" />
      </pattern>

      {/* Cross-hatch */}
      <pattern
        id="pattern-complex"
        x="0"
        y="0"
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
      >
        <line x1="0" y1="0" x2="8" y2="8" stroke={color} strokeWidth={sw} strokeOpacity="0.4" />
        <line x1="8" y1="0" x2="0" y2="8" stroke={color} strokeWidth={sw} strokeOpacity="0.4" />
      </pattern>

      {/* Fine dot */}
      <pattern
        id="pattern-fine"
        x="0"
        y="0"
        width="4"
        height="4"
        patternUnits="userSpaceOnUse"
      >
        <circle cx="2" cy="2" r={sw * 0.7} fill={color} fillOpacity="0.5" />
      </pattern>
    </defs>
  );
}
