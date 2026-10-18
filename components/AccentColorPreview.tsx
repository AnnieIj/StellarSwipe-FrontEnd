"use client";

interface AccentColorPreviewProps {
  color: string;
}

export function AccentColorPreview({ color }: AccentColorPreviewProps) {
  return (
    <div
      className="rounded-lg border border-border bg-surface p-4"
      style={
        {
          "--accent-preview": color,
          transition: "all 0.3s ease",
        } as React.CSSProperties
      }
    >
      <p className="mb-3 text-xs font-medium uppercase text-foreground-muted">
        Live Preview
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: color }}
        >
          Primary Button
        </button>

        <div
          className="rounded-md border p-3 transition-colors"
          style={{ borderColor: color, backgroundColor: `${color}10` }}
        >
          <p className="text-sm font-medium" style={{ color }}>
            Sample card content
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            This card uses the accent color for its border.
          </p>
        </div>

        <p className="text-sm">
          Text with an{" "}
          <a
            href="#"
            className="font-medium underline underline-offset-2 transition-colors"
            style={{ color }}
            onClick={(e) => e.preventDefault()}
          >
            accent-colored link
          </a>
        </p>
      </div>
    </div>
  );
}
