"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function RouteLoadingIndicator() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const prevPathname = useRef(pathname);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
        prevPathname.current = pathname;
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.01 : 0.15 }}
          className="fixed top-14 left-0 right-0 z-loading flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border shadow-lg">
            <Loader2
              className={prefersReduced ? "h-4 w-4 text-accent-primary" : "h-4 w-4 animate-spin text-accent-primary"}
              aria-hidden="true"
            />
            <span className="text-sm text-foreground-muted">Loading...</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
