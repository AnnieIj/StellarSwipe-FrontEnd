"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface TokenArtworkProps {
  /** Remote image URL for the token logo/artwork. */
  src?: string | null;
  /**
   * Ticker symbol or name of the token (e.g. "XLM", "USDC").
   * Used for alt text and the letter-based fallback.
   * Pass an empty string for purely decorative usage.
   */
  symbol: string;
  /** Pixel size in the layout. Defaults to 32. */
  size?: number;
  /** Additional classes forwarded to the outer container. */
  className?: string;
  /**
   * Load eagerly with high fetch priority. Use for above-the-fold artwork;
   * everything else is lazy-loaded.
   */
  priority?: boolean;
  /** next/image quality (1–100). Defaults to 75. */
  quality?: number;
}

/**
 * TokenArtwork — #564 image loading fallback for token logos and artwork.
 *
 * - Reserves stable dimensions before the remote image loads to avoid CLS.
 * - Shows a shimmer skeleton while loading.
 * - Falls back to a coloured circle with the token's first letter when the
 *   image is missing or errors.
 * - Alt text reflects the token symbol, or is empty for decorative contexts.
 */
export function TokenArtwork({
  src,
  symbol,
  size = 32,
  className,
  quality = 75,
  priority = false,
}: TokenArtworkProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    src ? "loading" : "error"
  );

  // Reset when the artwork URL changes so a new image gets its own placeholder.
  useEffect(() => {
    setStatus(src ? "loading" : "error");
  }, [src]);

  const isDecorative = symbol === "";
  const letter = symbol ? symbol.slice(0, 1).toUpperCase() : "?";
  const bgColor = deriveHslColor(symbol);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden={isDecorative || undefined}
    >
      {/* Skeleton shimmer while loading */}
      {status === "loading" && (
        <span
          className="skeleton-shimmer absolute inset-0 rounded-full bg-muted"
          aria-hidden="true"
        />
      )}

      {/* Remote token image */}
      {src && status !== "error" && (
        <Image
          src={src}
          alt={isDecorative ? "" : `${symbol} token logo`}
          width={size}
          height={size}
          quality={quality}
          className={cn(
            "rounded-full object-cover transition-opacity duration-200",
            status === "loaded" ? "opacity-100" : "opacity-0"
          )}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          sizes={`${size}px`}
        />
      )}

      {/* Letter fallback on error / missing src */}
      {status === "error" && (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white select-none"
          style={{
            background: bgColor,
            fontSize: Math.max(size * 0.42, 9),
          }}
          aria-hidden={isDecorative || undefined}
        >
          {letter}
        </span>
      )}
    </span>
  );
}

/** Deterministic HSL colour derived from a symbol string. */
function deriveHslColor(symbol: string): string {
  if (!symbol) return "hsl(220, 14%, 46%)";
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 60%, 38%)`;
}
