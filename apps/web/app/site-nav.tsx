import Link from "next/link";

const display = "font-[var(--font-radio-canada)]";

/**
 * Figma glass nav, shared by the live desk. Landing keeps its own
 * inline copy so the marketing page stays pixel-identical.
 */
export function SiteNav({ current = "home" }: { current?: "home" | "dashboard" }) {
  return (
    <nav
      className="desk-nav"
      style={{ backdropFilter: "blur(32px)" }}
    >
      <Link
        href="/"
        aria-label="Privent home"
        className={`${display} font-medium text-[20px] text-black leading-none tracking-[-0.4px] shrink-0 no-underline`}
      >
        Privent
      </Link>

      <div className={`hidden md:flex gap-[20px] items-center ${display}`}>
        <Link
          href="/#architecture"
          className={`${display} font-medium leading-[1.2] text-[16px] text-black whitespace-nowrap no-underline`}
        >
          Architecture
        </Link>
        <Link
          href="/#notes"
          className={`${display} font-medium leading-[1.2] text-[16px] text-black whitespace-nowrap no-underline`}
        >
          Notes
        </Link>
        <Link
          href="/dashboard"
          className={`${display} font-medium leading-[1.2] text-[16px] text-black whitespace-nowrap no-underline`}
        >
          {current === "dashboard" ? "Treasury" : "App"}
        </Link>
        <Link
          href={current === "dashboard" ? "/" : "/dashboard"}
          className={`${display} font-medium leading-[1.2] text-[16px] text-black whitespace-nowrap no-underline flex items-center gap-[4px]`}
        >
          {current === "dashboard" ? "Back to site" : "Get started"}
          <span aria-hidden="true" className="text-[12px]">↗</span>
        </Link>
      </div>
    </nav>
  );
}
