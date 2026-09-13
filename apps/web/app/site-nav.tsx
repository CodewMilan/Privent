import Link from "next/link";

/**
 * Semrush-style sticky nav: white background, logo left,
 * nav links (desktop only), Login + dark Sign-Up pill right.
 */
export function SiteNav({ current = "home" }: { current?: "home" | "dashboard" }) {
  return (
    <header className="site-nav">
      <Link href="/" className="nav-brand" aria-label="Privent home">
        {/* Simple wordmark mark */}
        <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect width="28" height="28" rx="6" fill="#181e15" />
          <path d="M7 20V8h6.5a4.5 4.5 0 0 1 0 9H9.5" stroke="#c190ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 17l3.5 3" stroke="#c190ff" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Privent</span>
      </Link>

      <nav className="nav-links" aria-label="Main navigation">
        <Link href="/#architecture">Architecture</Link>
        <Link href="/#demo">Demo</Link>
        <Link href="/#stats">Stats</Link>
        <Link href="/#resources">Notes</Link>
      </nav>

      <div className="nav-actions">
        {current === "dashboard" ? (
          <>
            <Link href="/" className="nav-login">Back to site</Link>
          </>
        ) : (
          <>
            <Link href="/dashboard" className="nav-login">Log in</Link>
            <Link href="/dashboard" className="nav-signup">Open the desk</Link>
          </>
        )}
      </div>
    </header>
  );
}
