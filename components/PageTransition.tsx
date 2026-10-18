"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

const variants = {
  hidden: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

/** Instant variants used when the user prefers reduced motion */
const reducedVariants = {
  hidden: { opacity: 0 },
  enter: { opacity: 1 },
  exit: { opacity: 0 },
};

export function PageTransition({ children }: PageTransitionProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={prefersReduced ? reducedVariants : variants}
      transition={
        prefersReduced
          ? { duration: 0.01 } // effectively instant
          : { duration: 0.25, ease: "easeInOut" }
      }
    >
      {children}
    </motion.div>
  );
}
