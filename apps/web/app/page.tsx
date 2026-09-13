"use client";

import { useEffect, useState } from "react";
import type { HealthResponse } from "@privent/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type HealthState =
  | { status: "loading" }
  | { status: "ok"; data: HealthResponse }
  | { status: "error"; message: string };

export default function HomePage() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        return (await response.json()) as HealthResponse;
      })
      .then((data) => setHealth({ status: "ok", data }))
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "API is unreachable";
        setHealth({ status: "error", message });
      });
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-6">
      <div>
        <p className="text-sm tracking-[0.2em] text-[#b8a57a] uppercase">
          Phase 1
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Privent</h1>
        <p className="mt-3 text-[#b4aea4]">
          AI proposes. Policy decides. A secure signer executes.
        </p>
      </div>

      <section className="rounded-lg border border-[#2a2b2e] bg-[#141517] p-5">
        <h2 className="text-sm font-medium text-[#b4aea4]">API health</h2>
        {health.status === "loading" && (
          <p className="mt-3 text-[#ece8e1]">Checking localhost:3001…</p>
        )}
        {health.status === "ok" && (
          <p className="mt-3 text-[#9ecb8a]">
            Connected · database {health.data.db}
          </p>
        )}
        {health.status === "error" && (
          <p className="mt-3 text-[#d27a70]">{health.message}</p>
        )}
      </section>
    </main>
  );
}
