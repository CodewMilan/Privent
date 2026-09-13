import Link from "next/link";
import "./landing.css";

/* ── Figma asset URLs (expires 7 days from generation) ─────────── */
const imgHeroImage  = "https://www.figma.com/api/mcp/asset/f0c0b776-652f-4d25-b93d-939e399d71ce.png";
const imgImage      = "https://www.figma.com/api/mcp/asset/544d159c-3ca5-49cf-83ba-be3d613b7ae9.png";
const imgValuesSection = "https://www.figma.com/api/mcp/asset/3ebfa3d3-fb1b-430f-9f26-d0990813ee4b.png";
const imgImage1     = "https://www.figma.com/api/mcp/asset/e8a09b8c-36c1-4715-974d-ba6139d22e6d.png";
const imgImage2     = "https://www.figma.com/api/mcp/asset/51f2a9ad-e2cd-40b1-83e1-d5ec2279e8aa.png";
const imgImage3     = "https://www.figma.com/api/mcp/asset/48aecc16-6667-4944-aa50-d34a282022d6.png";
const imgImage4     = "https://www.figma.com/api/mcp/asset/a314b34d-71f2-4925-8bb2-2acf010a454a.png";
const imgImage5     = "https://www.figma.com/api/mcp/asset/d540511e-0d8a-4748-be2b-f3118beb89de.png";
const imgFooterImage = "https://www.figma.com/api/mcp/asset/c9d77576-0af0-4252-9894-a0d09f3aa917.png";
const imgIcon       = "https://www.figma.com/api/mcp/asset/f569f04a-284e-44cc-9669-3a20f572b835.svg";
const imgIcon1      = "https://www.figma.com/api/mcp/asset/2ee63e29-7bd9-4e27-aef2-c3991e228557.svg";
const imgIcon2      = "https://www.figma.com/api/mcp/asset/0024af98-b698-4f9d-b6b3-c9487f353ef9.svg";
const imgSticker    = "https://www.figma.com/api/mcp/asset/392caefd-5956-49bd-8b24-bf4506734195.svg";
const imgQuotation  = "https://www.figma.com/api/mcp/asset/04704de6-d996-46bb-81e9-9ee9dfc48e24.svg";
const imgArrow      = "https://www.figma.com/api/mcp/asset/95c18f0f-ab55-4d5c-9b87-a89332c59c1f.svg";

/* ── Font helpers ───────────────────────────────────────────────── */
const F_SERIF   = "font-[var(--font-source-serif)]";
const F_DISPLAY = "font-[var(--font-radio-canada)]";
const F_MONO    = "font-[var(--font-geist-mono)]";

/* ── Button components ──────────────────────────────────────────── */
function ButtonPrimary({ label = "Request a demo", href = "#", className = "" }: { label?: string; href?: string; className?: string }) {
  return (
    <Link href={href} className={`bg-black content-stretch flex gap-[10px] items-center justify-center p-[16px] relative shrink-0 ${className}`}>
      <div className="bg-white relative shrink-0 size-[4px]" />
      <p className={`[word-break:break-word] ${F_MONO} font-medium leading-none relative shrink-0 text-[14px] text-white whitespace-nowrap`}>
        {label}
      </p>
    </Link>
  );
}

function ButtonSecondary({ label = "Watch case study", href = "#", className = "" }: { label?: string; href?: string; className?: string }) {
  return (
    <Link href={href} className={`bg-black content-stretch flex items-center justify-center p-[12px] relative shrink-0 ${className}`}>
      <p className={`[word-break:break-word] ${F_MONO} font-medium leading-none relative shrink-0 text-[14px] text-white whitespace-nowrap`}>
        {label}
      </p>
    </Link>
  );
}

/* ── Main landing component ─────────────────────────────────────── */
export function Landing() {
  return (
    <div className="bg-white content-stretch flex flex-col items-center relative size-full">

      {/* ── Intro + Features section ── */}
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
        {/* Gradient background */}
        <div className="absolute bg-gradient-to-b from-[#a8d3ff] inset-[0_0_58.25%_0] to-[#fff4df]" />

        {/* Intro / Hero */}
        <header className="content-stretch flex flex-col gap-[56px] items-center pt-[140px] px-[20px] relative shrink-0 w-full">
          <div className="content-stretch flex flex-col gap-[32px] items-center max-w-[1030px] relative shrink-0 w-full">
            {/* Header text */}
            <div className={`[word-break:break-word] content-stretch flex flex-col gap-[16px] items-center relative shrink-0 text-black text-center w-full`}>
              <div className="content-stretch flex flex-col items-center leading-none relative shrink-0 text-[80px] w-full">
                <h1 className={`block ${F_SERIF} mb-[-8px] not-italic relative shrink-0 tracking-[-3.2px] w-full`}>
                  Treasury control,
                </h1>
                <h2 className={`block ${F_DISPLAY} font-normal relative shrink-0 tracking-[-4px] w-full`}>
                  built for AI agents
                </h2>
              </div>
              <p className={`${F_SERIF} leading-[1.2] not-italic relative shrink-0 text-[20px] tracking-[-0.8px] w-full`}>
                Propose, evaluate, approve—with bounded authority and cryptographic certainty.
              </p>
            </div>

            {/* Button row */}
            <div className="content-stretch cursor-pointer flex gap-[16px] items-center relative shrink-0">
              <ButtonPrimary label="Open the live desk" href="/dashboard" className="cursor-pointer" />
              <ButtonPrimary label="View architecture" href="#architecture" className="cursor-pointer" />
            </div>
          </div>

          {/* Hero image card */}
          <div className="border-2 border-black border-solid h-[608px] relative rounded-[24px] shrink-0 w-[960px]">
            <img
              alt="Privent treasury desk showing AI-proposed transactions with policy decisions: $320 ALLOW, $1,200 REQUIRE_APPROVAL, $5,000 DENY"
              className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[24px] size-full"
              src={imgHeroImage}
            />
          </div>
        </header>

        {/* Features section */}
        <main id="architecture" className="content-stretch flex flex-col gap-[40px] items-center px-[20px] py-[120px] relative shrink-0 w-full" tabIndex={-1}>
          <h2 className={`[word-break:break-word] block ${F_DISPLAY} font-medium leading-none max-w-[612px] relative shrink-0 text-[40px] text-black text-center tracking-[-1.2px] w-full`}>
            Everything you need to propose, evaluate, and execute
          </h2>
          <div className="content-stretch flex gap-[40px] items-center max-w-[1500px] relative shrink-0 w-full">
            {/* Feature image */}
            <div className="h-[502px] relative shrink-0 w-[693px]">
              <img
                alt="Policy evaluation card showing signer isolation and treasury control"
                className="absolute inset-0 max-w-none object-cover pointer-events-none size-full"
                src={imgImage}
              />
            </div>

            {/* Feature list */}
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[24px] items-start min-w-px relative">
              <div className="[word-break:break-word] content-stretch flex flex-col items-start relative shrink-0 w-full">

                {/* 001 Propose */}
                <ul className="border-[#dbe0ec] border-solid border-t content-stretch flex flex-col gap-[16px] items-start py-[24px] relative shrink-0 w-full">
                  <li className="content-stretch flex gap-[16px] items-start leading-none relative shrink-0 w-full">
                    <h2 className={`block flex-[1_0_0] ${F_DISPLAY} font-medium min-w-px relative text-[20px] text-black tracking-[-0.4px]`}>Propose</h2>
                    <p className={`${F_MONO} font-normal relative shrink-0 text-[#6c6c6c] text-[14px] text-right whitespace-nowrap`}>001</p>
                  </li>
                  <li className={`block ${F_SERIF} leading-[0] not-italic relative shrink-0 text-[20px] text-black tracking-[-0.8px] w-full`}>
                    <p className="leading-[1.2]">LLM agent generates payment requests with amounts, recipients, and reasons</p>
                  </li>
                </ul>

                {/* 002 Evaluate */}
                <ul className="border-[#dbe0ec] border-solid border-t content-stretch flex flex-col gap-[16px] items-start py-[24px] relative shrink-0 w-full">
                  <li className="content-stretch flex gap-[16px] items-start leading-none relative shrink-0 w-full">
                    <h2 className={`block flex-[1_0_0] ${F_DISPLAY} font-medium min-w-px relative text-[20px] text-black tracking-[-0.4px]`}>Evaluate</h2>
                    <p className={`${F_MONO} font-normal relative shrink-0 text-[#6c6c6c] text-[14px] text-right whitespace-nowrap`}>002</p>
                  </li>
                  <li className={`block ${F_SERIF} leading-[0] not-italic relative shrink-0 text-[20px] text-black tracking-[-0.8px] w-full`}>
                    <p className="leading-[1.2]">Policy engine decides ALLOW, REQUIRE_APPROVAL, or DENY in real time</p>
                  </li>
                </ul>

                {/* 003 Sign */}
                <ul className="border-[#dbe0ec] border-solid border-t content-stretch flex flex-col gap-[16px] items-start py-[24px] relative shrink-0 w-full">
                  <li className="content-stretch flex gap-[16px] items-start leading-none relative shrink-0 w-full">
                    <h2 className={`block flex-[1_0_0] ${F_DISPLAY} font-medium min-w-px relative text-[20px] text-black tracking-[-0.4px]`}>Sign</h2>
                    <p className={`${F_MONO} font-normal relative shrink-0 text-[#6c6c6c] text-[14px] text-right whitespace-nowrap`}>003</p>
                  </li>
                  <li className={`block ${F_SERIF} leading-[0] not-italic relative shrink-0 text-[20px] text-black tracking-[-0.8px] w-full`}>
                    <p className="leading-[1.2]">Isolated signer re-verifies everything, then broadcasts on Sepolia if clear</p>
                  </li>
                </ul>

                {/* 004 Audit */}
                <ul className="border-[#dbe0ec] border-b border-solid border-t content-stretch flex flex-col gap-[16px] items-start py-[24px] relative shrink-0 w-full">
                  <li className="content-stretch flex gap-[16px] items-start leading-none relative shrink-0 w-full">
                    <h2 className={`block flex-[1_0_0] ${F_DISPLAY} font-medium min-w-px relative text-[20px] text-black tracking-[-0.4px]`}>Audit</h2>
                    <p className={`${F_MONO} font-normal relative shrink-0 text-[#6c6c6c] text-[14px] text-right whitespace-nowrap`}>004</p>
                  </li>
                  <li className={`block ${F_SERIF} leading-[0] not-italic relative shrink-0 text-[20px] text-black tracking-[-0.8px] w-full`}>
                    <p className="leading-[1.2]">Full action trail — every proposal, decision, and Sepolia receipt logged immutably</p>
                  </li>
                </ul>
              </div>

              <ButtonPrimary label="Explore the architecture" href="#architecture" className="cursor-pointer" />
            </div>
          </div>
        </main>
      </div>

      {/* ── Values section ── */}
      <section className="content-stretch flex flex-col gap-[40px] items-center px-[20px] py-[120px] relative shrink-0 w-full">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgValuesSection} />
        <div className={`[word-break:break-word] content-stretch flex flex-col items-end leading-none max-w-[1500px] relative shrink-0 text-[80px] text-black text-center w-full`}>
          <h2 className={`block ${F_SERIF} mb-[-8px] not-italic relative shrink-0 tracking-[-3.2px] w-full`}>
            Built for security,
          </h2>
          <h2 className={`block ${F_DISPLAY} font-normal relative shrink-0 tracking-[-4px] w-full`}>
            designed for trust
          </h2>
        </div>
        <div className="content-stretch flex gap-[16px] items-start max-w-[1500px] relative shrink-0 w-full">
          {/* Card 1 */}
          <div aria-label="Principle 1" className="bg-white content-stretch flex flex-[1_0_0] flex-col gap-[24px] items-start min-h-[246px] min-w-px p-[40px] relative rounded-[16px]">
            <div className="relative shrink-0 size-[42px]">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon} />
            </div>
            <div className={`[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 text-[20px] text-black w-full`}>
              <h2 className={`block ${F_DISPLAY} font-medium leading-none relative shrink-0 tracking-[-0.4px] w-full`}>Fail closed</h2>
              <p className={`${F_SERIF} leading-[1.2] not-italic relative shrink-0 tracking-[-0.8px] w-full`}>
                If anything is wrong, nothing moves. The signer refuses every request that doesn&apos;t pass independent re-verification.
              </p>
            </div>
          </div>
          {/* Card 2 */}
          <div aria-label="Principle 2" className="bg-white content-stretch flex flex-[1_0_0] flex-col gap-[24px] items-start min-h-[246px] min-w-px p-[40px] relative rounded-[16px]">
            <div className="relative shrink-0 size-[42px]">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon1} />
            </div>
            <div className={`[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 text-[20px] text-black w-full`}>
              <h2 className={`block ${F_DISPLAY} font-medium leading-none relative shrink-0 tracking-[-0.4px] w-full`}>Zero AI key access</h2>
              <p className={`${F_SERIF} leading-[1.2] not-italic relative shrink-0 tracking-[-0.8px] w-full`}>
                The agent package has no import path to the signer or blockchain executor. The isolation boundary is structural.
              </p>
            </div>
          </div>
          {/* Card 3 */}
          <div aria-label="Principle 3" className="bg-white content-stretch flex flex-[1_0_0] flex-col gap-[24px] items-start min-h-[246px] min-w-px p-[40px] relative rounded-[16px]">
            <div className="relative shrink-0 size-[42px]">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcon2} />
            </div>
            <div className={`[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 text-[20px] text-black w-full`}>
              <h2 className={`block ${F_DISPLAY} font-medium leading-none relative shrink-0 tracking-[-0.4px] w-full`}>Independent re-verification</h2>
              <p className={`${F_SERIF} leading-[1.2] not-italic relative shrink-0 tracking-[-0.8px] w-full`}>
                The signer re-reads the action from SQLite, re-runs policy, and checks chain, recipient, and amount itself.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Case study section ── */}
      <section className="content-stretch flex flex-col items-center px-[20px] py-[120px] relative shrink-0 w-full">
        <div className="bg-[#f6f8fb] content-stretch flex gap-[40px] items-center max-w-[980px] p-[20px] relative rounded-[16px] shrink-0 w-full">
          <div className="h-[280px] relative rounded-[8px] shrink-0 w-[498px]">
            <img
              alt="Treasury team reviewing policy-bounded AI transactions"
              className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[8px] size-full"
              src={imgImage1}
            />
          </div>
          <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-[403px]">
            <div className={`[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start relative shrink-0 text-[20px] text-black w-full`}>
              <h2 className={`block ${F_DISPLAY} font-medium leading-none relative shrink-0 tracking-[-0.4px] w-full`}>
                Why Acme Finance chose Privent
              </h2>
              <p className={`${F_SERIF} leading-[1.2] not-italic relative shrink-0 tracking-[-0.8px] w-full`}>
                With $5,000 prompt injections and growing compliance pressure, Acme needed real boundaries on AI spending. With Privent: policy checked every time, signing isolated, and 150+ tests proving it holds.
              </p>
            </div>
            <ButtonSecondary label="Open the live desk" href="/dashboard" className="cursor-pointer" />
          </div>
        </div>
      </section>

      {/* ── Journal / Notes section ── */}
      <section id="notes" className="content-stretch flex flex-col gap-[40px] items-center px-[20px] relative shrink-0 w-full">
        <h2 className={`[word-break:break-word] block ${F_DISPLAY} font-medium leading-none max-w-[612px] relative shrink-0 text-[40px] text-black text-center tracking-[-1.2px] w-full`}>
          From the logs
        </h2>
        <div className="content-stretch flex flex-col gap-[24px] items-center max-w-[620px] relative shrink-0 w-full">
          <div className="content-stretch flex flex-col items-start relative shrink-0">
            {/* Article 1 */}
            <article className="border-[#dbe0ec] border-b border-solid border-t content-stretch flex items-start relative shrink-0 w-[620px]">
              <div className="content-stretch flex items-start justify-between py-[24px] relative shrink-0 w-[620px]">
                <div className="h-[100px] relative shrink-0 w-[165px]">
                  <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage2} />
                </div>
                <div className={`[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start leading-none relative shrink-0 w-[439px]`}>
                  <p className={`${F_DISPLAY} font-medium min-w-full relative shrink-0 text-[20px] text-black tracking-[-0.4px] w-[min-content]`}>
                    Why the Signer Never Trusts the API
                  </p>
                  <div className={`content-stretch flex ${F_MONO} font-normal gap-[8px] items-start relative shrink-0 text-[#6c6c6c] text-[14px] whitespace-nowrap`}>
                    <p className="relative shrink-0">Architecture</p>
                    <p className="relative shrink-0">·</p>
                    <p className="relative shrink-0">4 min</p>
                  </div>
                </div>
              </div>
            </article>
            {/* Article 2 */}
            <article className="border-[#dbe0ec] border-b border-solid content-stretch flex items-start relative shrink-0 w-[620px]">
              <div className="content-stretch flex items-start justify-between py-[24px] relative shrink-0 w-[620px]">
                <div className="h-[100px] relative shrink-0 w-[165px]">
                  <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage3} />
                </div>
                <div className={`[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start leading-none relative shrink-0 w-[439px]`}>
                  <p className={`${F_DISPLAY} font-medium min-w-full relative shrink-0 text-[20px] text-black tracking-[-0.4px] w-[min-content]`}>
                    What Happens on a $5,000 Prompt Injection
                  </p>
                  <div className={`content-stretch flex ${F_MONO} font-normal gap-[8px] items-start relative shrink-0 text-[#6c6c6c] text-[14px] whitespace-nowrap`}>
                    <p className="relative shrink-0">Attack demo</p>
                    <p className="relative shrink-0">·</p>
                    <p className="relative shrink-0">3 min</p>
                  </div>
                </div>
              </div>
            </article>
            {/* Article 3 */}
            <article className="border-[#dbe0ec] border-b border-solid content-stretch flex items-start relative shrink-0 w-[620px]">
              <div className="content-stretch flex items-start justify-between py-[24px] relative shrink-0 w-[620px]">
                <div className="h-[100px] relative shrink-0 w-[165px]">
                  <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage4} />
                </div>
                <div className={`[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start leading-none relative shrink-0 w-[439px]`}>
                  <p className={`${F_DISPLAY} font-medium min-w-full relative shrink-0 text-[20px] text-black tracking-[-0.4px] w-[min-content]`}>
                    How App and Wallet Policy Intersect
                  </p>
                  <div className={`content-stretch flex ${F_MONO} font-normal gap-[8px] items-start relative shrink-0 text-[#6c6c6c] text-[14px] whitespace-nowrap`}>
                    <p className="relative shrink-0">Policy</p>
                    <p className="relative shrink-0">·</p>
                    <p className="relative shrink-0">5 min</p>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <ButtonSecondary label="Open the live desk" href="/dashboard" className="cursor-pointer" />

          {/* Sticker decoration */}
          <div className="absolute flex h-[221.12px] items-center justify-center left-[-287px] top-[-109px] w-[420.665px]">
            <div className="-rotate-10 flex-none">
              <div aria-hidden className="content-stretch flex flex-col h-[154px] items-start relative w-[400px]">
                <div aria-hidden className="h-[154.001px] relative shrink-0 w-[400px]">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSticker} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial section ── */}
      <section className="content-stretch flex items-start justify-center px-[20px] py-[120px] relative shrink-0 w-full">
        <div className="content-stretch flex flex-[1_0_0] gap-[16px] items-center max-w-[1500px] min-w-px relative">
          {/* Portrait */}
          <div className="aspect-[612/700] flex-[1_0_0] min-w-px relative">
            <img
              alt="Demo operator reviewing treasury policy decisions on Sepolia"
              className="absolute inset-0 max-w-none object-cover pointer-events-none size-full"
              src={imgImage5}
            />
          </div>
          {/* Quote */}
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[56px] items-start justify-center min-w-px px-[105px] relative">
            <div aria-hidden className="h-[20px] relative shrink-0 w-[24px]" role="presentation">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgQuotation} />
            </div>
            <h2 className={`[word-break:break-word] block ${F_DISPLAY} font-medium leading-none min-w-full relative shrink-0 text-[40px] text-black tracking-[-1.2px] w-[min-content]`}>
              We finally moved past guesswork and prompt injection risks. Now we have real policy enforcement to protect real funds.
            </h2>
            <div className={`[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 text-[20px] w-full`}>
              <p className={`${F_DISPLAY} font-medium leading-none relative shrink-0 text-black tracking-[-0.4px] w-full`}>
                Acme Finance
              </p>
              <p className={`${F_SERIF} leading-[1.2] not-italic relative shrink-0 text-[#6c6c6c] tracking-[-0.8px] w-full`}>
                Demo operator · Sepolia testnet
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Call to action ── */}
      <aside className="bg-[#f6f8fb] content-stretch flex flex-col gap-[32px] items-center px-[20px] py-[120px] relative shrink-0 w-full">
        <h4 className={`[word-break:break-word] block ${F_DISPLAY} font-medium leading-none max-w-[1500px] min-w-full relative shrink-0 text-[40px] text-black text-center tracking-[-1.2px] w-[min-content]`}>
          Ready to give your AI agent bounded treasury access?
        </h4>
        <Link
          href="/dashboard"
          className="bg-black content-stretch cursor-pointer flex gap-[10px] items-center justify-center p-[16px] relative shrink-0"
        >
          <div className="bg-white relative shrink-0 size-[4px]" />
          <p className={`[word-break:break-word] ${F_MONO} font-medium leading-none relative shrink-0 text-[14px] text-left text-white whitespace-nowrap`}>
            Open the live desk
          </p>
        </Link>
      </aside>

      {/* ── Footer ── */}
      <footer className={`bg-[#fff546] content-stretch flex flex-col gap-[20px] items-center p-[20px] relative shrink-0 w-full`}>
        <div className={`[word-break:break-word] content-stretch flex items-center justify-between relative shrink-0 text-[#66640f] text-[20px] w-full`}>
          <div className={`content-stretch flex ${F_DISPLAY} font-medium gap-[20px] items-center leading-none relative shrink-0 tracking-[-0.4px] whitespace-nowrap`}>
            <Link href="/#architecture" className="relative shrink-0 text-[#66640f]">Architecture</Link>
            <Link href="/#notes" className="relative shrink-0 text-[#66640f]">Notes</Link>
            <Link href="/dashboard" className="relative shrink-0 text-[#66640f]">Demo</Link>
            <Link href="https://sepolia.etherscan.io" className="block cursor-pointer relative shrink-0 text-[#66640f]" target="_blank" rel="noreferrer">
              Sepolia
            </Link>
            <Link href="/dashboard" className="block cursor-pointer relative shrink-0 text-[#66640f]">
              Get started
            </Link>
          </div>
          <p className={`${F_SERIF} leading-[1.2] not-italic relative shrink-0 text-right tracking-[-0.8px] whitespace-pre`}>
            {`© 2026  ·  All rights reserved`}
          </p>
        </div>
        <div aria-hidden className="h-[280px] mix-blend-multiply opacity-90 relative shrink-0 w-full" role="presentation">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgFooterImage} />
        </div>
        {/* Wordmark — rendered as large text instead of SVG image */}
        <div
          aria-label="Privent company wordmark"
          className={`content-stretch flex flex-col items-start relative shrink-0 w-full`}
        >
          <p
            className={`${F_DISPLAY} font-medium w-full text-[#66640f] leading-none tracking-[-0.04em]`}
            style={{ fontSize: "clamp(48px, 15vw, 204px)", margin: 0 }}
          >
            Privent
          </p>
        </div>
      </footer>

      {/* ── Navigation (absolute, glass) ── */}
      <nav
        className={`absolute backdrop-blur-[32px] bg-[rgba(255,255,255,0.72)] content-stretch flex h-[60px] items-center justify-between left-0 p-[20px] right-0 top-0`}
        style={{ backdropFilter: "blur(32px)" }}
      >
        {/* Logo */}
        <Link
          href="/"
          aria-label="Privent home"
          className={`${F_DISPLAY} font-medium text-[20px] text-black leading-none tracking-[-0.4px] shrink-0 no-underline`}
        >
          Privent
        </Link>

        {/* Nav items */}
        <div className={`content-stretch flex gap-[20px] items-center relative shrink-0`}>
          <Link href="/#architecture" className={`[word-break:break-word] ${F_DISPLAY} font-medium leading-[1.2] relative shrink-0 text-[16px] text-black whitespace-nowrap`}>
            Architecture
          </Link>
          <Link href="/#notes" className={`[word-break:break-word] ${F_DISPLAY} font-medium leading-[1.2] relative shrink-0 text-[16px] text-black whitespace-nowrap`}>
            Notes
          </Link>
          <Link href="/dashboard" className={`[word-break:break-word] ${F_DISPLAY} font-medium leading-[1.2] relative shrink-0 text-[16px] text-black whitespace-nowrap`}>
            Demo
          </Link>
          <Link
            href="/dashboard"
            className={`content-stretch cursor-pointer flex gap-[4px] items-center justify-center relative shrink-0`}
          >
            <p className={`[word-break:break-word] ${F_DISPLAY} font-medium leading-[1.2] relative shrink-0 text-[16px] text-black text-left whitespace-nowrap`}>
              Get started
            </p>
            <div className="flex flex-row items-center self-stretch">
              <div className="content-stretch flex h-full items-center relative shrink-0 w-[14px]">
                <div className="flex h-[9px] items-center justify-center relative shrink-0 w-[11.225px]">
                  <div className="-rotate-90 flex-none">
                    <div aria-hidden className="h-[11.225px] relative w-[9px]" role="presentation">
                      <div className="absolute inset-[-2.23%_-2.78%_-3.15%_-2.78%]">
                        <img alt="" className="block max-w-none size-full" src={imgArrow} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
