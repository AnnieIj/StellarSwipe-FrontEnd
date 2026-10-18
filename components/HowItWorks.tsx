"use client";

import { Wallet, Users, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  fadeUpVariants,
  fadeUpVariantsReduced,
  useScrollViewport,
} from "@/hooks/useScrollAnimation";

const steps = [
  {
    icon: Wallet,
    title: "Connect Wallet",
    description:
      "Link your Freighter wallet in one click. No sign-up, no custody — you stay in control.",
  },
  {
    icon: Users,
    title: "Follow Providers",
    description:
      "Browse verified signal providers ranked by performance and follow the ones you trust.",
  },
  {
    icon: Zap,
    title: "Swipe to Trade",
    description:
      "Review live signals and execute trades directly on the Stellar SDEX with a single swipe.",
  },
];

export function HowItWorks() {
  const scrollProps = useScrollViewport();
  const prefersReduced = useReducedMotion();
  const variants = prefersReduced ? fadeUpVariantsReduced : fadeUpVariants;
  return (
    <section className="w-full py-16 px-6" aria-labelledby="how-heading">
      <div className="mx-auto max-w-4xl text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-sky-400 mb-2">
          How it works
        </p>
        <h2
          id="how-heading"
          className="text-3xl font-bold text-white tracking-tight"
        >
          Three steps to master the SDEX
        </h2>
      </div>

      <div className="mx-auto max-w-4xl relative">
        {/* Horizontal connector — desktop only */}
        <div
          className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-white/10"
          aria-hidden
        />

        <div className="grid gap-10 md:grid-cols-3 md:gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                custom={i}
                variants={variants}
                {...scrollProps}
                className="flex flex-col items-center text-center gap-4"
              >
                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-slate-900 shadow-lg">
                  <Icon size={28} className="text-sky-400" aria-hidden />
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
