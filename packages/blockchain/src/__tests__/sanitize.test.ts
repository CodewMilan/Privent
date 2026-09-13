import { describe, expect, it } from "vitest";
import { sanitizeMetadata, sanitizeValue } from "../sanitize.js";

describe("audit sanitizer", () => {
  it("redacts private key fields but keeps transaction hashes", () => {
    const hash =
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const cleaned = sanitizeMetadata({
      privateKey:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      hash,
      nested: {
        secret: "shh",
        ok: "vendor payment",
      },
    });

    expect(cleaned).toEqual({
      privateKey: "[redacted]",
      hash,
      nested: {
        secret: "[redacted]",
        ok: "vendor payment",
      },
    });
  });

  it("strips an env private key out of strings", () => {
    const previous = process.env.EXECUTOR_PRIVATE_KEY;
    process.env.EXECUTOR_PRIVATE_KEY =
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    try {
      expect(
        sanitizeValue(
          "used 0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc to sign",
        ),
      ).toBe("used [redacted] to sign");
    } finally {
      if (previous === undefined) {
        delete process.env.EXECUTOR_PRIVATE_KEY;
      } else {
        process.env.EXECUTOR_PRIVATE_KEY = previous;
      }
    }
  });
});
