import Link from "next/link";

/**
 * Semrush-style footer: dark CTA section on top + white multi-column links.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="footer-cols" aria-label="Footer navigation">
        <div className="footer-col">
          <p className="footer-brand">Privent</p>
          <p className="footer-brand-desc">
            Bounded financial authority for autonomous agents. The AI proposes.
            Policy decides. An isolated signer executes.
          </p>
        </div>
        <div className="footer-col">
          <p className="footer-col-heading">Product</p>
          <Link href="/dashboard">Live desk</Link>
          <Link href="/#demo">Three-amount story</Link>
          <Link href="/#architecture">Signer isolation</Link>
          <Link href="/#stats">Stats</Link>
        </div>
        <div className="footer-col">
          <p className="footer-col-heading">Technology</p>
          <a href="https://sepolia.etherscan.io" rel="noreferrer" target="_blank">
            Sepolia explorer
          </a>
          <a href="https://thegraph.com" rel="noreferrer" target="_blank">
            The Graph
          </a>
          <a href="https://privy.io" rel="noreferrer" target="_blank">
            Privy
          </a>
          <a href="https://openrouter.ai" rel="noreferrer" target="_blank">
            OpenRouter
          </a>
        </div>
        <div className="footer-col">
          <p className="footer-col-heading">Security posture</p>
          <span>AI key access · none</span>
          <span>Policy · enforced</span>
          <span>Signer · isolated</span>
          <span>Ledger · not connected</span>
          <span>Arc · not connected</span>
        </div>
      </nav>

      <div className="footer-bottom">
        <span>© 2026 Privent. All rights reserved.</span>
        <span>Built on Sepolia · The Graph · Privy · OpenRouter</span>
      </div>
    </footer>
  );
}
