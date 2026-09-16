import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  JOB_MATCH_CV_MAX_CHARS,
  JOB_MATCH_JOB_MAX_CHARS,
  prepareJobMatchInputs,
  truncateForJobMatch,
} from "./job-match-input"

describe("job-match-input truncation", () => {
  it("leaves short text unchanged", () => {
    const result = truncateForJobMatch("hello", 100, "cv")
    assert.equal(result.text, "hello")
    assert.equal(result.truncated, false)
  })

  it("truncates long CV and job description to configured limits", () => {
    const cv = "A".repeat(JOB_MATCH_CV_MAX_CHARS + 500)
    const job = "B".repeat(JOB_MATCH_JOB_MAX_CHARS + 200)
    const prepared = prepareJobMatchInputs({ cvText: cv, jobDescription: job })
    assert.equal(prepared.cvTruncated, true)
    assert.equal(prepared.jobTruncated, true)
    assert.ok(prepared.cvText.length < cv.length)
    assert.ok(prepared.jobDescription.length < job.length)
    assert.match(prepared.cvText, /truncated for match/)
    assert.match(prepared.jobDescription, /truncated for match/)
  })
})
