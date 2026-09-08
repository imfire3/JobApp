import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { upsertApplicationsFromAppliedJobs } from "@/lib/applications/upsert-from-job"

describe("upsertApplicationsFromAppliedJobs", () => {
  it("no-ops on empty job list", async () => {
    let called = false
    const supabase = {
      from: () => {
        called = true
        return {}
      },
    }
    const result = await upsertApplicationsFromAppliedJobs(supabase, "user-1", [])
    assert.equal(result.error, null)
    assert.equal(called, false)
  })

  it("inserts when no CRM row exists for the job", async () => {
    const captured: { row?: Record<string, unknown> } = {}
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
        insert: async (values: Record<string, unknown>) => {
          captured.row = values
          return { error: null }
        },
      }),
    }

    const result = await upsertApplicationsFromAppliedJobs(supabase, "user-1", [
      { id: "job-1", title: "PO", company: "Acme" },
    ])

    assert.equal(result.error, null)
    assert.equal(captured.row?.job_id, "job-1")
    assert.equal(captured.row?.status, "applied")
    assert.equal(captured.row?.company, "Acme")
    assert.equal(captured.row?.position, "PO")
  })

  it("updates existing CRM row for the same job", async () => {
    const captured: { id?: string; row?: Record<string, unknown> } = {}
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "app-1" }, error: null }),
            }),
          }),
        }),
        update: (values: Record<string, unknown>) => ({
          eq: async (_col: string, value: string) => {
            captured.row = values
            captured.id = value
            return { error: null }
          },
        }),
      }),
    }

    const result = await upsertApplicationsFromAppliedJobs(supabase, "user-1", [
      { id: "job-1", title: "PM", company: "Beta" },
    ])

    assert.equal(result.error, null)
    assert.equal(captured.id, "app-1")
    assert.equal(captured.row?.status, "applied")
    assert.equal(captured.row?.position, "PM")
  })
})
