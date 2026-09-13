"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { SPRING } from "./motion";

export function FadeIn({
  delay = 0,
  children,
  className,
}: {
  delay?: number;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : { ...SPRING, delay: delay / 1000 }
      }
    >
      {children}
    </motion.div>
  );
}
