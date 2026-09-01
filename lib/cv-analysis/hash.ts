import { createHash } from "node:crypto";

export function normalizeCvContent(text: string): string {
  return text.trim().replace(/\r\n/g, "\n");
}

export function hashCvContent(text: string): string {
  return createHash("sha256").update(normalizeCvContent(text), "utf8").digest("hex");
}
