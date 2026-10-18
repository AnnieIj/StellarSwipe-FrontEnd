"use client";

import { useMemo, useState } from "react";
import { Download, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type ShareStatKey = "periodReturn" | "winRate" | "totalTrades" | "avgRoi";

interface ShareStat {
  key: ShareStatKey;
  label: string;
  value: string;
}

const DEFAULT_STATS: ShareStat[] = [
  { key: "periodReturn", label: "Period P&L", value: "+18.4%" },
  { key: "winRate", label: "Win Rate", value: "62%" },
  { key: "totalTrades", label: "Closed Trades", value: "47" },
  { key: "avgRoi", label: "Avg ROI/Trade", value: "+2.1%" },
];

const DEFAULT_SELECTION: ShareStatKey[] = ["periodReturn", "winRate"];

function drawPnlCard(stats: ShareStat[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to generate share card.");
  }

  const bgGradient = ctx.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  bgGradient.addColorStop(0, "#0f172a");
  bgGradient.addColorStop(1, "#1e293b");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(56, 189, 248, 0.16)";
  ctx.beginPath();
  ctx.arc(1050, 80, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(34, 197, 94, 0.18)";
  ctx.beginPath();
  ctx.arc(110, 560, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 56px Inter, sans-serif";
  ctx.fillText("StellarSwipe Performance", 68, 118);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 28px Inter, sans-serif";
  ctx.fillText("My latest trading snapshot", 68, 160);

  const cardTop = 220;
  const cardHeight = 320;
  const cardWidth = 1064;

  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  ctx.strokeStyle = "rgba(148, 163, 184, 0.24)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(68, cardTop, cardWidth, cardHeight, 24);
  ctx.fill();
  ctx.stroke();

  const colCount = Math.max(1, stats.length);
  const colWidth = cardWidth / colCount;

  stats.forEach((stat, index) => {
    const x = 68 + colWidth * index + 32;
    const y = cardTop + 82;

    ctx.fillStyle = "#64748b";
    ctx.font = "500 25px Inter, sans-serif";
    ctx.fillText(stat.label.toUpperCase(), x, y);

    ctx.fillStyle = stat.value.startsWith("+") ? "#34d399" : "#e2e8f0";
    ctx.font = "700 58px Inter, sans-serif";
    ctx.fillText(stat.value, x, y + 88);

    if (index < stats.length - 1) {
      const dividerX = 68 + colWidth * (index + 1);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dividerX, cardTop + 34);
      ctx.lineTo(dividerX, cardTop + cardHeight - 34);
      ctx.stroke();
    }
  });

  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 22px Inter, sans-serif";
  ctx.fillText("stellarswipe.app", 68, 585);

  return canvas;
}

export function PnLShareCardGenerator() {
  const [selectedStats, setSelectedStats] =
    useState<ShareStatKey[]>(DEFAULT_SELECTION);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const statsForCard = useMemo(
    () => DEFAULT_STATS.filter((stat) => selectedStats.includes(stat.key)),
    [selectedStats]
  );

  const toggleStat = (key: ShareStatKey) => {
    setSelectedStats((current) => {
      if (current.includes(key)) {
        if (current.length === 1) return current;
        return current.filter((value) => value !== key);
      }
      return [...current, key];
    });
  };

  const generatePreview = () => {
    const canvas = drawPnlCard(statsForCard);
    setPreviewUrl(canvas.toDataURL("image/png"));
    setShareError(null);
  };

  const handleDownload = () => {
    if (!previewUrl) return;

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = "stellarswipe-pnl-card.png";
    link.click();
  };

  const handleShare = async () => {
    if (!previewUrl || !navigator.share) {
      setShareError("Web Share is not available in this browser.");
      return;
    }

    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const file = new File([blob], "stellarswipe-pnl-card.png", {
        type: "image/png",
      });

      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        setShareError(
          "This device cannot share files directly. Download instead."
        );
        return;
      }

      await navigator.share({
        title: "My StellarSwipe P&L",
        text: "My latest performance snapshot from StellarSwipe.",
        files: [file],
      });
      setShareError(null);
    } catch {
      setShareError(
        "Share cancelled or unavailable. You can download the card instead."
      );
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-sky-400">
            Share
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            P&L image card
          </h2>
          <p className="text-sm text-foreground-muted">
            Select the stats to include, generate a preview, then download or
            share.
          </p>
        </div>
        <Sparkles className="h-5 w-5 text-sky-400" aria-hidden="true" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DEFAULT_STATS.map((stat) => (
          <label
            key={stat.key}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <span>{stat.label}</span>
            <input
              type="checkbox"
              checked={selectedStats.includes(stat.key)}
              onChange={() => toggleStat(stat.key)}
              aria-label={`Include ${stat.label}`}
              className="h-4 w-4 rounded border-white/20 accent-sky-500"
            />
          </label>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={generatePreview}>
          Generate card preview
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          disabled={!previewUrl}
          className="gap-1.5"
        >
          <Download className="h-4 w-4" />
          Download image
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleShare}
          disabled={!previewUrl}
          className="gap-1.5"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>

      {shareError && (
        <p className="mb-3 text-xs text-amber-400">{shareError}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview of generated P&L share card"
            className="h-auto w-full"
          />
        ) : (
          <div className="flex h-44 items-center justify-center text-sm text-foreground-muted">
            Preview appears here after generating the card.
          </div>
        )}
      </div>
    </section>
  );
}
