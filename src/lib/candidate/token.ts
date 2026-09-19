import { createHash, randomBytes } from "node:crypto";

export function createAttemptToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAttemptToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
