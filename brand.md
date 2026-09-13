# Brand — Privent

_Status: deferred_

The user chose to defer brand setup. This project is currently using a dark warm-paper treasury palette from Phase 1, not a generated shadcn theme. The `frontend-design-guidelines` skill will quietly use these defaults and will not prompt again.

To set up a real brand palette, typography, and voice at any time, run:

    /brand-design

or say: "pick brand colors"

When `brand-design` runs, it will detect this deferred state, skip the "confirm overwrite" step, and proceed directly to the full brand setup. The resulting palette will be applied to `app/globals.css` and this file will be replaced with the real brand documentation.

_Deferred at: 2026-09-13T05:27:00.000Z_
