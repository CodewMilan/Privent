import { spawn } from "node:child_process";
import type { ExecutionPermit } from "@privent/blockchain";
import { previewFromPermit } from "./types.js";
import type { GenuineCheck, LedgerConfirmation, LedgerSigner } from "./types.js";

export interface CliLedgerOptions {
  bin?: string;
  account?: string;
  exec?: (argv: string[]) => Promise<{ ok: boolean; stdout: string }>;
}

function runCommand(
  argv: string[],
): Promise<{ ok: boolean; stdout: string }> {
  return new Promise((resolve) => {
    const child = spawn(argv[0] as string, argv.slice(1), {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.on("error", () => {
      resolve({ ok: false, stdout: "wallet-cli is not installed" });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, stdout });
    });
  });
}

/**
 * Optional real CLI adapter. Default confirm is dry-run only — we do not
 * broadcast from the device unless a caller later opts into that. Missing
 * binary or failed genuine-check refuses to confirm, never signs.
 */
export function createCliLedger(options: CliLedgerOptions = {}): LedgerSigner {
  const bin = options.bin ?? "wallet-cli";
  const exec = options.exec ?? runCommand;

  return {
    kind: "cli",
    async genuineCheck(): Promise<GenuineCheck> {
      const result = await exec([bin, "genuine-check", "--output", "json"]);
      return { genuine: result.ok, source: "cli" };
    },
    async preview(permit: ExecutionPermit) {
      return previewFromPermit(permit);
    },
    async confirm(permit: ExecutionPermit): Promise<LedgerConfirmation> {
      const check = await this.genuineCheck();
      const preview = previewFromPermit(permit);
      if (!check.genuine) {
        throw new Error("Ledger genuine-check failed — refusing to sign");
      }
      const dryRun = await exec([
        bin,
        "send",
        options.account ?? "privent",
        "--to",
        permit.transfer.to,
        "--amount",
        preview.amountLabel,
        "--dry-run",
        "--output",
        "json",
      ]);
      if (!dryRun.ok) {
        throw new Error("Ledger dry-run failed — transaction not signed");
      }
      return {
        actionRequestId: permit.transfer.actionRequestId,
        status: "confirmed",
        device: "cli",
        preview,
      };
    },
  };
}
