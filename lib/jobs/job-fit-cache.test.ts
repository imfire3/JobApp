import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { JOB_MATCH_PROMPT_VERSION } from "@/lib/ai/prompts/job-match"
import { hashCvContent } from "@/lib/cv-analysis/hash"
import {
  hashJobContent,
  isJobFitCacheValid,
} from "@/lib/jobs/job-fit-cache"
import type { Job } from "@/types"

function baseJob(overrides: Partial<Job> = {}): Job {
  const cv = "Mon CV Product Owner"
  const description = "Offre Product Owner Middle Office"
  const cvHash = hashCvContent(cv)
  const jobHash = hashJobContent({
    title: "PO",
    company: "Acme",
    description,
    summary: null,
  })
  return {
    id: "job-1",
    user_id: "u1",
    source: "csv",
    title: "PO",
    company: "Acme",
    location: "Paris",
    remote: false,
    url: "https://example.com/1",
    description,
    summary: null,
    salary: null,
    posted_at: null,
    status: "new",
    match_score: 70,
    match_reasons: ["ok"],
    match_gaps: [],
    cover_letter_angle: null,
    cover_letter: null,
    selected: false,
    imported_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    raw_data: {
      job_fit: {
        cv_content_hash: cvHash,
        job_content_hash: jobHash,
        prompt_version: JOB_MATCH_PROMPT_VERSION,
        job_posting_summary: "Résumé",
      },
    },
    ...overrides,
  } as Job
}

describe("hashJobContent", () => {
  it("is stable for same content", () => {
    const a = hashJobContent({ title: "A", company: "B", description: "C" })
    const b = hashJobContent({ title: "A", company: "B", description: "C" })
    assert.equal(a, b)
  })

  it("changes when description changes", () => {
    const a = hashJobContent({ title: "A", company: "B", description: "C" })
    const b = hashJobContent({ title: "A", company: "B", description: "D" })
    assert.notEqual(a, b)
  })
})

describe("isJobFitCacheValid", () => {
  const cv = "Mon CV Product Owner"

  it("hits when hashes and prompt match", () => {
    assert.equal(isJobFitCacheValid(baseJob(), cv, JOB_MATCH_PROMPT_VERSION), true)
  })

  it("misses when CV changed", () => {
    assert.equal(
      isJobFitCacheValid(baseJob(), "Autre CV", JOB_MATCH_PROMPT_VERSION),
      false
    )
  })

  it("misses when job description changed", () => {
    assert.equal(
      isJobFitCacheValid(
        baseJob({ description: "Nouvelle description longue" }),
        cv,
        JOB_MATCH_PROMPT_VERSION
      ),
      false
    )
  })

  it("misses when prompt version changed", () => {
    assert.equal(isJobFitCacheValid(baseJob(), cv, "v-old"), false)
  })

  it("misses legacy analyses without hashes", () => {
    const job = baseJob({
      raw_data: {
        job_fit: {
          prompt_version: JOB_MATCH_PROMPT_VERSION,
          job_posting_summary: "Résumé",
        },
      },
    })
    assert.equal(isJobFitCacheValid(job, cv, JOB_MATCH_PROMPT_VERSION), false)
  })
})

describe("isJobFitCacheValidClient", () => {
  const cv = "Mon CV Product Owner"

  it("hits when CV analysis hash matches stored meta", async () => {
    const { isJobFitCacheValidClient } = await import(
      "@/lib/jobs/job-fit-cache-client"
    )
    const job = baseJob()
    const cvHash = hashCvContent(cv)
    assert.equal(
      isJobFitCacheValidClient(
        job,
        { cv_content_hash: cvHash, is_stale: false },
        JOB_MATCH_PROMPT_VERSION
      ),
      true
    )
  })

  it("misses when CV analysis is stale", async () => {
    const { isJobFitCacheValidClient } = await import(
      "@/lib/jobs/job-fit-cache-client"
    )
    const job = baseJob()
    assert.equal(
      isJobFitCacheValidClient(
        job,
        { cv_content_hash: hashCvContent(cv), is_stale: true },
        JOB_MATCH_PROMPT_VERSION
      ),
      false
    )
  })
})
