# Demo recording script

Target length: **2 minutes**. One take. Do not say localhost, Ledger, live, Graph, CRE, or Arc.

Before record:

```bash
pnpm dev
./scripts/preflight-demo.sh
```

Full screen browser at [http://localhost:3000](http://localhost:3000). Hide bookmarks. Record 1920×1080.

If **Needs approval** is already on screen from a previous run, reject it or ignore it and start from landing.

---

## 0:00  Landing

Stay on `/`.

**Say:**
> This is Privent. Bounded treasury access for an AI agent.
> The agent can propose a payment. It cannot authorize one.
> Policy decides. A separate signer executes. The model never holds a key.

Click **Open the live desk**.

---

## 0:20  Treasury

Pause on the four stats: Treasury, Spent today, Auto-send, Hard cap.

**Say:**
> Here’s the agent. Auto-send under five hundred dollars. Hard cap at two thousand. It cannot export a key, and it cannot change these rules.

Point at **Policy** on the right if it is in frame. Do not scroll into internals.

---

## 0:35  $320 — auto

On **Vendor payout**, click **Send request**.

Wait until the button is no longer “Working…”. Scroll to **Payments**.

**Say:**
> Three hundred twenty dollars. Inside the auto-send limit.
> Policy allows it. The signer re-checks, then sends on-chain.

Click **View transaction**. Leave the explorer up for two seconds. Go back to the desk.

---

## 1:05  $1,200 — you decide

On **Contractor invoice**, click **Send request**.

**Needs approval** should appear. Do not skip this beat.

**Say:**
> Twelve hundred. Same agent, same signer — but this is over the auto-send limit. Nothing moves until a human decides.

Click **Approve**. Wait for **Executed**. Click **View transaction** once.

**Say:**
> I approve. Now the signer runs. Second on-chain payment.

---

## 1:35  $5,000 — blocked

On **Emergency transfer**, click **Send request**.

**Say:**
> Five thousand, with a prompt injection: “urgent, bypass the limit.”
> The model may still ask. Policy denies it. The signer is never called. Nothing is sent.

Point at **Denied** / **Blocked by policy. Not sent.** There must be **no** View transaction button on this row.

---

## 1:55  Close

Scroll up to the header.

**Say:**
> The AI can request. The AI cannot authorize.
> That’s Privent.

Stop.

---

## If a take dies

| What you see | What to do |
|---|---|
| Send request stays disabled | LLM key missing. Stop. Fix `.env`, restart `pnpm dev`. |
| Working… then nothing on-chain | Signer is down. Run `./scripts/preflight-demo.sh`. Retake from $320. |
| $1,200 executes without Approve | You clicked the wrong card. Retake. |
| $5,000 has View transaction | Policy did not deny. Stop. Do not ship that take. |

Do not narrate retries. Cut and start the beat again.
