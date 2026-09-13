const REDACTED = "[redacted]";

const SENSITIVE_KEY =
  /private[_-]?key|secret|mnemonic|seed[_-]?phrase|passphrase|authorization/i;

export function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    const envKey = process.env.EXECUTOR_PRIVATE_KEY;
    if (envKey && value.includes(envKey)) {
      return value.split(envKey).join(REDACTED);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : sanitizeValue(nested);
    }
    return out;
  }

  return value;
}

export function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }
  return sanitizeValue(metadata) as Record<string, unknown>;
}
