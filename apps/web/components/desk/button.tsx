"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function DeskButton({
  children,
  busy,
  ghost,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  busy?: boolean;
  ghost?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type={props.type ?? "button"}
      className={`desk-btn ${ghost ? "desk-btn-ghost" : ""} ${className}`}
      disabled={props.disabled || busy}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      {...props}
    >
      <span className="dot" aria-hidden="true" />
      {busy ? "Working…" : children}
    </motion.button>
  );
}
