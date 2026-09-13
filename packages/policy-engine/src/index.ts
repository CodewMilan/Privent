export const PACKAGE_NAME = "policy-engine" as const;

export { evaluateAction } from "./evaluate.js";
export { canApproveAction, canChangePolicy } from "./authorize.js";
