/* ─────────────────────────────────────────────────────────
 * PAGE CONTENT STORYBOARD
 *
 * Static shell (nav, footer) never re-animates.
 *
 *    0ms   header + stats
 *  120ms   agent actions
 *  240ms   approvals (if any)
 *  320ms   payments + policy
 * ───────────────────────────────────────────────────────── */

export const TIMING = {
  header: 0,
  stats: 80,
  actions: 120,
  approvals: 240,
  main: 320,
  list: 40,
} as const;

export const SPRING = {
  type: "spring" as const,
  stiffness: 350,
  damping: 28,
};
