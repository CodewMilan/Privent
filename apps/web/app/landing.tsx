import Link from "next/link";
import { LocalClock } from "./clock";
import "./landing.css";
import { Mark } from "./mark";

const CAPABILITIES = [
  ["Policy engine", "01"],
  ["Isolated signer", "02"],
  ["Live graph", "03"],
  ["Sepolia execution", "04"],
  ["Audit trail", "05"],
];

const WORK = [
  {
    href: "/dashboard",
    title: "$320 auto-send",
    copy: "Real LLM proposal. Policy ALLOW. Isolated signer broadcasts on Sepolia. Receipt and audit written.",
    action: "Open live desk",
    visual: "dark" as const,
    figure: (
      <>
        <div>ALLOW</div>
        <div className="big">$320</div>
        <div>Sepolia · confirmed</div>
      </>
    ),
  },
  {
    href: "/dashboard",
    title: "$1,200 human approval",
    copy: "Same agent. Same signer. Policy stops at REQUIRE_APPROVAL until a human decides.",
    action: "Open live desk",
    visual: "paper" as const,
    figure: (
      <>
        <div>Waiting</div>
        <div className="big">$1,200</div>
        <div>Human gate · then signer</div>
      </>
    ),
  },
  {
    href: "/dashboard",
    title: "$5,000 attack denied",
    copy: "Prompt injection can make the model propose $5,000. Policy denies it. The signer is never called.",
    action: "See the attack",
    visual: "lilac" as const,
    figure: (
      <>
        <div>Denied</div>
        <div className="big">$5,000</div>
        <div>No signer request</div>
      </>
    ),
  },
  {
    href: "/dashboard",
    title: "Isolated signer process",
    copy: "apps/signer owns the private key on :3002. The API and the LLM have no path to it.",
    action: "See architecture",
    visual: "blue" as const,
    figure: (
      <>
        <div>Key access</div>
        <div className="big">None</div>
        <div>Process boundary · fail closed</div>
      </>
    ),
  },
  {
    href: "/dashboard",
    title: "Independent re-verification",
    copy: "The signer re-reads the action, re-runs policy, and checks approval, chain, recipient, and amount itself.",
    action: "Open live desk",
    visual: "sky" as const,
    figure: (
      <>
        <div>Trust model</div>
        <div className="big">Zero</div>
        <div>Does not trust the API row</div>
      </>
    ),
  },
  {
    href: "/dashboard",
    title: "Live Uniswap pulse",
    copy: "The Graph Subgraph Studio gateway. Real USDC/WETH pool data, not a fixture.",
    action: "Open live desk",
    visual: "paper" as const,
    figure: (
      <>
        <div>The Graph</div>
        <div className="big">Live</div>
        <div>Uniswap V3 · USDC/WETH</div>
      </>
    ),
  },
  {
    href: "/dashboard",
    title: "Prompt-injection test",
    copy: "Automated test: the model may output $5,000 JSON. Policy still DENY. Zero signer.requested events.",
    action: "Open live desk",
    visual: "dark" as const,
    figure: (
      <>
        <div>Attack path</div>
        <div className="big">Closed</div>
        <div>150 tests · fail closed</div>
      </>
    ),
  },
  {
    href: "/dashboard",
    title: "Append-only audit",
    copy: "Every proposal, policy decision, signer call, and receipt is a real row. No private key ever lands in it.",
    action: "Open live desk",
    visual: "lilac" as const,
    figure: (
      <>
        <div>Audit</div>
        <div className="big">Real</div>
        <div>State changes only</div>
      </>
    ),
  },
];

const STATS = [
  {
    value: "$500",
    title: "Auto limit",
    copy: "Under this amount, policy ALLOW and the isolated signer may broadcast without a human.",
  },
  {
    value: "$2,000",
    title: "Deny cap",
    copy: "At or above this amount, policy DENY. Nothing reaches the signer. The attack story uses $5,000.",
  },
  {
    value: "150",
    title: "Passing tests",
    copy: "Including signer boundary, replay, approval bypass, agent-id spoofing, and the $5,000 injection.",
  },
  {
    value: "2",
    title: "Processes",
    copy: "API on :3001 holds no key. Signer on :3002 is the only process that can broadcast.",
  },
  {
    value: "0",
    title: "AI key access",
    copy: "The agent package has no dependency on the signer or the blockchain executor.",
  },
  {
    value: "11155111",
    title: "Chain id",
    copy: "Live Sepolia. The signer refuses if the wallet chain id does not match.",
  },
];

const NOTES = [
  {
    kind: "Architecture",
    date: "Sep 13, 2026",
    title: "Why the signer never trusts the API",
    copy: "POST /sign accepts only an action id and an agent id. The signer rebuilds the transaction from SQLite and re-runs policy from scratch.",
  },
  {
    kind: "Attack",
    date: "Sep 13, 2026",
    title: "What happens on a $5,000 prompt injection",
    copy: "The model may emit the requested JSON. Policy DENY. Audit writes execution.skipped. Zero signer.requested events.",
  },
  {
    kind: "Policy",
    date: "Sep 13, 2026",
    title: "How app policy and wallet policy intersect",
    copy: "The tighter of the two wins. A lied-about ALLOW in the database still fails when the signer re-evaluates.",
  },
];

export function Landing() {
  return (
    <div className="landing">
      <div className="landing-grid" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="landing-inner">
        <header className="landing-nav">
          <Link href="/" className="nav-brand" aria-label="Privent home">
            <Mark />
            <span style={{ marginLeft: 10 }}>Privent · treasury desk</span>
          </Link>
          <Link href="#architecture" className="nav-links">
            Architecture
          </Link>
          <Link href="#work" className="nav-links">
            The demo
          </Link>
          <Link href="#notes" className="nav-links">
            Notes
          </Link>
          <Link href="/dashboard" className="nav-cta">
            Open the desk
            <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <section className="hero">
          <p className="eyebrow">
            <span style={{ color: "#2020df" }}>●</span>
            Live Sepolia · isolated signer · no mocks
          </p>
          <h1>Giving autonomous agents bounded access to a treasury</h1>
          <div className="hero-split">
            <div>
              <p className="kicker">Who we are</p>
              <p>
                A company desk for AI that can spend. The model proposes. Policy
                decides. A separate process signs. The agent never holds a key.
              </p>
              <Link href="/dashboard" className="inline-link">
                Open the live desk
              </Link>
            </div>
            <div>
              <p className="kicker">Capabilities</p>
              <ol className="service-list">
                {CAPABILITIES.map(([label, n]) => (
                  <li key={n}>
                    <span>{label}</span>
                    <span className="dots" />
                    <span>{n}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>

      <section className="reel" aria-label="Product preview">
        <div className="reel-frame">
          <div className="dash-preview">
            <p className="chip">Treasury desk</p>
            <h4>Privent</h4>
            <div className="rows">
              <div className="row">
                <span>$320 USDC</span>
                <span className="allow">ALLOW</span>
              </div>
              <div className="row">
                <span>$1,200 USDC</span>
                <span className="wait">REQUIRE_APPROVAL</span>
              </div>
              <div className="row">
                <span>$5,000 USDC</span>
                <span className="deny">DENY</span>
              </div>
            </div>
          </div>
          <Link href="/dashboard" className="reel-play" aria-label="Open the live treasury desk">
            <span>Play</span>
          </Link>
        </div>
      </section>

      <div className="landing-inner">
        <section className="statement" id="architecture">
          <h2>
            We&apos;re the policy-bounded signer for treasury teams that will
            not let an agent hold a <em>key</em>
          </h2>
        </section>

        <div className="work-head" id="work">
          <p>The three-transaction story</p>
          <Link href="/dashboard" className="inline-link" style={{ marginTop: 0 }}>
            Open the live desk
          </Link>
        </div>
        <p className="work-tags">
          Policy · Signer · Sepolia · The Graph · LLM · Audit · Fail closed
        </p>

        <div className="work-grid">
          {WORK.map((item) => (
            <Link key={item.title} href={item.href} className="work-card">
              <div className={`work-visual mock ${item.visual}`}>{item.figure}</div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <span className="view">{item.action}</span>
            </Link>
          ))}
        </div>

        <blockquote className="quote">
          <div>
            <p className="kicker">Acme finance</p>
            <p className="kicker">Demo operator · sepolia</p>
            <div
              className="avatar"
              aria-hidden="true"
              style={{
                marginTop: 16,
                background: "#2020df",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 28,
              }}
            >
              A
            </div>
          </div>
          <h3>
            The agent can propose anything. Policy still decides. The signer
            still checks. That is the whole product.
          </h3>
        </blockquote>

        <section className="stats">
          {STATS.map((stat) => (
            <article key={stat.title} className="stat">
              <p className="value">{stat.value}</p>
              <h3>{stat.title}</h3>
              <p>{stat.copy}</p>
            </article>
          ))}
        </section>

        <section className="awards">
          <p className="kicker">Security posture · this demo</p>
          <h2
            style={{
              margin: "12px 0 0",
              fontSize: "clamp(22px, 3vw, 36px)",
              fontWeight: 400,
              textTransform: "uppercase",
              letterSpacing: "-0.04em",
              maxWidth: "28ch",
            }}
          >
            What is live, and what we do not claim
          </h2>
          <div className="awards-row">
            <span>AI key access · none</span>
            <span>Policy · enforced</span>
            <span>Signer · isolated</span>
            <span>The Graph · live</span>
            <span>Sepolia · live</span>
            <span>Ledger · not connected</span>
            <span>Chainlink CRE · not connected</span>
            <span>Arc · not connected</span>
          </div>
        </section>

        <section className="notes" id="notes">
          <h2>Notes</h2>
          {NOTES.map((note) => (
            <article key={note.title} className="note">
              <p className="kicker">
                {note.kind}
                <br />
                {note.date}
              </p>
              <div>
                <h3>{note.title}</h3>
                <p>{note.copy}</p>
              </div>
              <Link href="/dashboard" className="inline-link">
                Read
              </Link>
            </article>
          ))}
        </section>

        <blockquote className="quote">
          <div>
            <p className="kicker">Isolated signer</p>
            <p className="kicker">:3002 · fail closed</p>
          </div>
          <h3>
            If the API is compromised, the key is still in another process.
            If policy is lied about, the signer still denies.
          </h3>
        </blockquote>
      </div>

      <section className="cta-pair">
        <Link href="/dashboard" className="cta-card sky">
          <div className="top">
            <span>Open the desk</span>
            <span>↗</span>
          </div>
          <h2>Run the three-amount story on Sepolia</h2>
        </Link>
        <a href="#architecture" className="cta-card blue">
          <div className="top">
            <span>Architecture</span>
            <span>↗</span>
          </div>
          <h2>See how the signer stays isolated</h2>
        </a>
      </section>

      <div className="landing-inner">
        <p className="wordmark">Privent</p>
        <nav className="footer-grid" aria-label="Footer">
          <div>
            <Link href="/dashboard">Live desk</Link>
            <Link href="#work">Three-amount story</Link>
            <Link href="#architecture">Signer isolation</Link>
          </div>
          <div>
            <Link href="#notes">Notes</Link>
            <a href="https://sepolia.etherscan.io" rel="noreferrer" target="_blank">
              Sepolia explorer
            </a>
            <a href="https://thegraph.com" rel="noreferrer" target="_blank">
              The Graph
            </a>
          </div>
          <div>
            <span style={{ display: "block", padding: "6px 0" }}>Ledger · off</span>
            <span style={{ display: "block", padding: "6px 0" }}>CRE · off</span>
            <span style={{ display: "block", padding: "6px 0" }}>Arc · off</span>
          </div>
          <div>
            <span style={{ display: "block", padding: "6px 0" }}>
              AI key access · none
            </span>
            <span style={{ display: "block", padding: "6px 0" }}>
              Signer · isolated
            </span>
          </div>
        </nav>
        <div className="footer-meta">
          <span>Bounded financial authority for autonomous agents</span>
          <LocalClock />
        </div>
      </div>
    </div>
  );
}
