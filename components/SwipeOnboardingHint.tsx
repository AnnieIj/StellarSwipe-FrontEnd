"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_TIMEOUT_MS = 5_000;
const STORAGE_KEY = "stellar-swipe-onboarded";

interface SwipeOnboardingHintProps {
  onDismiss?: () => void;
}

export function SwipeOnboardingHint({ onDismiss }: SwipeOnboardingHintProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // sessionStorage unavailable — show hint anyway
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(handleDismiss, DISMISS_TIMEOUT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const handleDismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Swipe gesture onboarding"
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center",
        "rounded-2xl bg-black/60 backdrop-blur-sm",
        "animate-in fade-in"
      )}
    >
      <button
        onClick={handleDismiss}
        aria-label="Dismiss onboarding hint"
        className="absolute top-3 right-3 rounded-full p-1 text-white/60 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>

      <style>{`
        @keyframes swipeHint {
          0%, 100% { transform: translateX(0); }
          30% { transform: translateX(-16px); }
          60% { transform: translateX(16px); }
        }
        .swipe-gesture-icon {
          animation: swipeHint 2s ease-in-out infinite;
        }
      `}</style>

      <div className="flex flex-col items-center gap-4">
        <div className="swipe-gesture-icon relative h-12 w-32">
          <div className="absolute inset-y-0 left-0 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full border-2 border-white/40 bg-white/10 flex items-center justify-center text-xs text-white/70">
              ✕
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ArrowLeftRight size={20} className="text-white/80" />
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full border-2 border-green-400/50 bg-green-400/10 flex items-center justify-center text-xs text-green-300/70">
              ♥
            </div>
          </div>
        </div>

        <p className="text-center text-sm font-medium text-white/90">
          Swipe left to dismiss, right to save
        </p>
        <p className="text-center text-xs text-white/50">
          This hint will disappear automatically
        </p>
      </div>
    </div>
  );
}
