"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function DeskButton({
  children,
  busy,
  ghost,
  className = "",
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  busy?: boolean;
  ghost?: boolean;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type={type}
      className={`desk-btn ${ghost ? "desk-btn-ghost" : ""} ${className}`}
      disabled={disabled || busy}
      onClick={onClick}
      whileTap={reduce ? undefined : { scale: 0.98 }}
    >
      <span className="dot" aria-hidden="true" />
      {busy ? "Working…" : children}
    </motion.button>
  );
}
