import Link from "next/link";

const display = "font-[var(--font-radio-canada)]";
const serif = "font-[var(--font-source-serif)]";

/**
 * Yellow Figma footer, used on the live desk. Wordmark is set in
 * Radio Canada Big so it matches the landing without the asset image.
 */
export function SiteFooter() {
  return (
    <footer className="bg-[#fff546] flex flex-col gap-[20px] items-center p-[20px] w-full">
      <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between w-full text-[#66640f] text-[20px]">
        <div className={`${display} font-medium flex flex-wrap gap-[20px] items-center leading-none tracking-[-0.4px]`}>
          <Link href="/#architecture" className="text-[#66640f] no-underline">
            Architecture
          </Link>
          <Link href="/#notes" className="text-[#66640f] no-underline">
            Notes
          </Link>
          <Link href="/dashboard" className="text-[#66640f] no-underline">
            Live desk
          </Link>
          <a
            href="https://sepolia.etherscan.io"
            className="text-[#66640f] no-underline"
            target="_blank"
            rel="noreferrer"
          >
            Sepolia
          </a>
        </div>
        <p className={`${serif} leading-[1.2] not-italic text-right tracking-[-0.8px] m-0`}>
          © 2026  ·  All rights reserved
        </p>
      </div>
      <div aria-label="Privent wordmark" className="w-full">
        <p
          className={`${display} font-medium w-full text-[#66640f] leading-none tracking-[-0.04em] m-0`}
          style={{ fontSize: "clamp(48px, 15vw, 204px)" }}
        >
          Privent
        </p>
      </div>
    </footer>
  );
}
