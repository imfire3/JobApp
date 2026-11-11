import { createHmac, timingSafeEqual } from "node:crypto"
import { buildJobInsertPayload } from "@/lib/jobs/mapper"
import type { ImportRow } from "@/lib/imports/jobs-file"

export function buildPasteCorrection(row: ImportRow, userId: string) {
  const mapped = buildJobInsertPayload({ userId, job: row, rawData: row.raw_data })
  // Explicit allowlist: never overwrite status, notes, selection, letters or CRM.
  return {
    title: mapped.title, company: mapped.company, city: mapped.city,
    contract_type: mapped.contract_type, remote_mode: mapped.remote_mode,
    salary_min: mapped.salary_min, salary_max: mapped.salary_max,
    experience_min_years: mapped.experience_min_years,
    experience_level: mapped.experience_level, published_at: mapped.published_at,
    description: mapped.description,
  }
}

export type PasteCorrectionTicket = {
  userId: string; jobId: string; updatedAt: string; expires: number
  fields: ReturnType<typeof buildPasteCorrection>
  source: Record<string, unknown>
}

export function signPasteCorrection(value: PasteCorrectionTicket, secret: string): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`
}

export function readPasteCorrection(token: string, secret: string): PasteCorrectionTicket | null {
  const [payload, signature, extra] = token.split(".")
  if (!payload || !signature || extra) return null
  const expected = createHmac("sha256", secret).update(payload).digest()
  const received = Buffer.from(signature, "base64url")
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PasteCorrectionTicket
    return value.expires > Date.now() ? value : null
  } catch { return null }
}
