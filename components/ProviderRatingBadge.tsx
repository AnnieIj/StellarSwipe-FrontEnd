"use client";

import { useEffect, useRef, useState } from "react";
import { Star, ShieldCheck, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProviderProfile } from "@/hooks/useProviderProfile";

interface ProviderRatingBadgeProps {
  /** Trust/reputation score 0–100 */
  trustScore?: number;
  /** Win rate percentage 0–100 */
  winRate?: number;
  /** Provider display name */
  providerName?: string;
  /** Total signals published */
  totalSignals?: number;
  /** Compact mode for mobile / tight layouts */
  compact?: boolean;
  /** Provider ID — when supplied, sources breakdown data from useProviderProfile */
  providerId?: string;
  className?: string;
}

/**
 * Derives a 1–5 star rating from a 0–100 trust score.
 */
function scoreToStars(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

/**
 * Returns a colour class and label based on the trust score tier.
 */
function scoreTier(score: number): { color: string; label: string } {
  if (score >= 90)
    return { color: "text-emerald-400", label: "Highly Trusted" };
  if (score >= 75) return { color: "text-sky-400", label: "Trusted" };
  if (score >= 60) return { color: "text-yellow-400", label: "Moderate" };
  if (score >= 40) return { color: "text-orange-400", label: "Caution" };
  return { color: "text-red-400", label: "Low Trust" };
}

/** Contributing factors and their display weights for the trust score breakdown */
const TRUST_FACTORS: Array<{
  key: keyof typeof FACTOR_LABELS;
  weight: string;
}> = [
  { key: "trustScore", weight: "40%" },
  { key: "winRate", weight: "30%" },
  { key: "reputation", weight: "20%" },
  { key: "overallScore", weight: "10%" },
];

const FACTOR_LABELS = {
  trustScore: "Trust Score",
  winRate: "Win Rate",
  reputation: "Reputation",
  overallScore: "Overall Score",
} as const;

export function ProviderRatingBadge({
  trustScore,
  winRate,
  providerName,
  totalSignals,
  compact = false,
  providerId,
  className,
}: ProviderRatingBadgeProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Fetch detailed breakdown when providerId is supplied
  const { data: profileData } = useProviderProfile(providerId ?? "");

  // Use profile data as the authoritative source when available
  const resolvedTrustScore = profileData?.trustScore ?? trustScore;
  const resolvedWinRate = profileData?.winRate ?? winRate;
  const resolvedTotalSignals = profileData?.totalSignals ?? totalSignals;
  const resolvedName = profileData?.name ?? providerName;

  const popoverId = `provider-rating-popover-${resolvedName ?? "unknown"}`;

  function togglePopover() {
    setPopoverOpen((v) => !v);
  }

  function closePopover() {
    setPopoverOpen(false);
    triggerRef.current?.focus();
  }

  // Dismiss on Escape and outside click
  useEffect(() => {
    if (!popoverOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePopover();
    }
    function onPointerDown(e: PointerEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        closePopover();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [popoverOpen]);

  // Nothing to show if no rating data is available
  if (resolvedTrustScore === undefined && resolvedWinRate === undefined)
    return null;

  const score = resolvedTrustScore ?? resolvedWinRate ?? 0;
  const stars = scoreToStars(score);
  const { color, label } = scoreTier(score);

  const trigger = compact ? (
    <button
      ref={triggerRef}
      type="button"
      aria-controls={popoverId}
      aria-expanded={popoverOpen}
      aria-label={`Provider rating: ${label}, ${stars} out of 5 stars. Click for breakdown.`}
      className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      onClick={togglePopover}
    >
      <ShieldCheck size={11} className={color} aria-hidden="true" />
      <span className={color}>{stars}★</span>
    </button>
  ) : (
    <button
      ref={triggerRef}
      type="button"
      aria-controls={popoverId}
      aria-expanded={popoverOpen}
      aria-label={`Provider rating: ${label}, ${stars} out of 5 stars${
        resolvedWinRate !== undefined ? `, ${resolvedWinRate}% win rate` : ""
      }. Click for breakdown.`}
      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      onClick={togglePopover}
    >
      <ShieldCheck size={13} className={color} aria-hidden="true" />
      <span className={color}>{label}</span>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={10}
            className={
              i < stars ? "fill-yellow-400 text-yellow-400" : "text-white/20"
            }
          />
        ))}
      </span>
      {resolvedWinRate !== undefined && (
        <>
          <span className="text-white/20">·</span>
          <TrendingUp
            size={11}
            className="text-emerald-400"
            aria-hidden="true"
          />
          <span className="text-emerald-400">{resolvedWinRate}%</span>
        </>
      )}
      <Info size={11} className="text-white/30" aria-hidden="true" />
    </button>
  );

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      {trigger}

      {popoverOpen && (
        <div
          id={popoverId}
          ref={popoverRef}
          role="dialog"
          aria-label="Provider rating breakdown"
          aria-modal="false"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900 p-3 text-xs shadow-xl shadow-black/40"
        >
          <p className="mb-2 font-semibold text-white">
            {resolvedName ? `${resolvedName} · ` : ""}Trust Score Breakdown
          </p>

          {/* Contributing factors */}
          <div className="mb-2 space-y-1.5">
            {TRUST_FACTORS.map(({ key, weight }) => {
              const raw = profileData
                ? (profileData as unknown as Record<string, unknown>)[key]
                : key === "trustScore"
                ? resolvedTrustScore
                : key === "winRate"
                ? resolvedWinRate
                : undefined;
              const val = typeof raw === "number" ? raw : undefined;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-slate-400">
                    {FACTOR_LABELS[key]}
                    <span className="ml-1 text-slate-600">({weight})</span>
                  </span>
                  <span className={cn("font-medium", color)}>
                    {val !== undefined ? `${val}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/10 pt-2 space-y-1 text-slate-400">
            <div className="flex items-center justify-between">
              <span>Composite score</span>
              <span className={cn("font-medium", color)}>{score}/100</span>
            </div>
            {resolvedTotalSignals !== undefined && (
              <div className="flex items-center justify-between">
                <span>Total signals</span>
                <span className="font-medium text-white">
                  {resolvedTotalSignals.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Stars</span>
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={10}
                    className={
                      i < stars
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-white/20"
                    }
                  />
                ))}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closePopover}
            className="mt-2 w-full rounded border border-white/10 py-1 text-slate-400 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            Close
          </button>

          {/* Arrow */}
          <div
            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
