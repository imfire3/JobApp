import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { ImportedJob } from "@/types"
import { parseJobsImportFile } from "@/lib/imports/jobs-file"

const FAKE_FILL_CSV = join(process.cwd(), "data", "fake_fill_jobs.csv")

let cachedBaseJobs: ImportedJob[] | null = null

function loadFakeFillJobs(): ImportedJob[] {
  if (cachedBaseJobs) return cachedBaseJobs

  const buffer = readFileSync(FAKE_FILL_CSV)
  const parsed = parseJobsImportFile(buffer)
  if (parsed.rows.length === 0) {
    throw new Error("data/fake_fill_jobs.csv contains no valid job rows")
  }

  cachedBaseJobs = parsed.rows.map((row) => ({
    title: row.title,
    company: row.company,
    source: row.source,
    location: row.location,
    remote: row.remote,
    salary: row.salary,
    contract_type: row.contract_type ?? "CDI",
    posted_at: row.posted_at,
    url: row.url,
    description: row.description,
  }))

  return cachedBaseJobs
}

function withUniqueSeedUrl(url: string, stamp: string, index: number): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set("jt_seed", `${stamp}-${index}`)
    return parsed.toString()
  } catch {
    const sep = url.includes("?") ? "&" : "?"
    return `${url}${sep}jt_seed=${stamp}-${index}`
  }
}

/** Fresh fake job offers for local/dev — sourced from data/fake_fill_jobs.csv. */
export function generateFakeJobs(count?: number): ImportedJob[] {
  const base = loadFakeFillJobs()
  const stamp = Date.now().toString(36)
  const n =
    typeof count === "number" && Number.isFinite(count)
      ? Math.max(1, Math.min(Math.round(count), base.length))
      : base.length

  return base.slice(0, n).map((offer, index) => ({
    ...offer,
    url: withUniqueSeedUrl(offer.url, stamp, index),
    posted_at:
      offer.posted_at ||
      new Date(Date.now() - index * 45 * 60 * 1000).toISOString(),
  }))
}

export function getFakeFillJobCount(): number {
  return loadFakeFillJobs().length
}
