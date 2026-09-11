import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { generateFakeJobs, getFakeFillJobCount } from "@/lib/dev/fake-jobs"

describe("generateFakeJobs", () => {
  it("loads real WTTJ offers from fake_fill_jobs.csv", () => {
    const jobs = generateFakeJobs()
    assert.equal(jobs.length, getFakeFillJobCount())
    assert.ok(jobs.length >= 5)
    assert.match(jobs[0]?.company ?? "", /Hubvisory/i)
    assert.match(jobs[0]?.title ?? "", /Lead Product Manager/i)
    assert.match(jobs[0]?.url ?? "", /welcometothejungle\.com/)
    assert.match(jobs[0]?.url ?? "", /jt_seed=/)
    assert.ok((jobs[0]?.description ?? "").length > 200)
  })

  it("respects count and keeps unique seed urls", () => {
    const jobs = generateFakeJobs(2)
    assert.equal(jobs.length, 2)
    assert.notEqual(jobs[0]?.url, jobs[1]?.url)
  })
})
