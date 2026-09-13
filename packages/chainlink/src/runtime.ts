import { createHash } from "node:crypto";

export type TeeType = "nitro";

export type TeeConstraint =
  | Record<string, never>
  | { regions: string[] }
  | Array<{ tee: TeeType; regions?: string[] }>;

export interface ConfidentialSecret {
  id: string;
  value: string;
}

export interface AttestedReport {
  encodedPayload: string;
  encoderName: string;
  signingAlgo: string;
  hashingAlgo: string;
  attestation: string;
  simulated: true;
  tee: "nitro-sim";
}

export interface DonRuntime {
  report(input: {
    encodedPayload: string;
    encoderName: string;
    signingAlgo: string;
    hashingAlgo: string;
  }): { result: () => AttestedReport };
}

export interface TeeRuntime<C> {
  config: C;
  getSecret(req: { id: string }): { result: () => ConfidentialSecret };
  getSecrets(
    reqs: Array<{ id: string }>,
  ): { result: () => Record<string, ConfidentialSecret> };
  usingTheDons(): DonRuntime;
  log(message: string): void;
}

export function handlerInTee<T, C>(
  _trigger: unknown,
  callback: (runtime: TeeRuntime<C>) => T,
  _tees: TeeConstraint,
): (runtime: TeeRuntime<C>) => T {
  return callback;
}

function readSecret(
  secrets: Record<string, string>,
  id: string,
): ConfidentialSecret {
  const value = secrets[id];
  if (value === undefined) {
    throw new Error(`Secret ${id} is not available inside the enclave`);
  }
  return { id, value };
}

export function createSimulatedTeeRuntime<C>(
  config: C,
  secrets: Record<string, string>,
  options: { allowLogs?: boolean } = {},
): TeeRuntime<C> {
  return {
    config,
    getSecret(req) {
      return { result: () => readSecret(secrets, req.id) };
    },
    getSecrets(reqs) {
      return {
        result: () => {
          const out: Record<string, ConfidentialSecret> = {};
          for (const req of reqs) {
            out[req.id] = readSecret(secrets, req.id);
          }
          return out;
        },
      };
    },
    usingTheDons() {
      return {
        report(input) {
          return {
            result: () => {
              const salt = secrets.STRATEGY_SALT ?? "";
              const attestation = createHash("sha256")
                .update(`${salt}:${input.encodedPayload}`)
                .digest("hex");
              return {
                ...input,
                attestation,
                simulated: true,
                tee: "nitro-sim",
              };
            },
          };
        },
      };
    },
    log(message) {
      if (options.allowLogs) {
        console.info(message);
      }
    },
  };
}
