"use client";

import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  fadeInVariants,
  fadeInVariantsReduced,
  useScrollViewport,
} from "@/hooks/useScrollAnimation";

export function CTABanner() {
  const { connected, connect } = useWallet();
  const [loading, setLoading] = useState(false);
  const scrollProps = useScrollViewport();
  const prefersReduced = useReducedMotion();
  const variants = prefersReduced ? fadeInVariantsReduced : fadeInVariants;

  async function handleConnect() {
    setLoading(true);
    try {
      await connect();
    } finally {
      setLoading(false);
    }
  }

  if (connected) return null;

  return (
    <motion.section
      variants={variants}
      {...scrollProps}
      className="w-full rounded-2xl bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800 p-8 sm:p-12 text-center shadow-xl"
      aria-labelledby="cta-heading"
    >
      <h2
        id="cta-heading"
        className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
      >
        Start trading smarter on the SDEX
      </h2>
      <p className="mt-3 text-sm sm:text-base text-sky-100 max-w-md mx-auto">
        Connect your Freighter wallet to access live signals, follow top
        providers, and execute trades in one swipe.
      </p>
      <Button
        size="lg"
        disabled={loading}
        onClick={handleConnect}
        className="mt-6 bg-white text-blue-700 hover:bg-sky-50 font-semibold min-h-[48px] px-8 disabled:opacity-60"
        aria-label="Connect your Freighter wallet"
      >
        <Wallet size={18} aria-hidden />
        {loading ? "Connecting…" : "Connect Wallet"}
      </Button>
    </motion.section>
  );
}
