import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  kanbanColumnForStatus,
  KANBAN_PIPELINE_COLUMNS,
} from "@/lib/jobs/status-labels"

describe("kanbanColumnForStatus", () => {
  it("buckets new and cover_generated into selected", () => {
    assert.equal(kanbanColumnForStatus("new"), "selected")
    assert.equal(kanbanColumnForStatus("cover_generated"), "selected")
    assert.equal(kanbanColumnForStatus("selected"), "selected")
  })

  it("maps pipeline statuses 1:1", () => {
    assert.equal(kanbanColumnForStatus("applied"), "applied")
    assert.equal(kanbanColumnForStatus("interview"), "interview")
    assert.equal(kanbanColumnForStatus("offer"), "offer")
  })

  it("excludes rejected and archived", () => {
    assert.equal(kanbanColumnForStatus("rejected"), null)
    assert.equal(kanbanColumnForStatus("archived"), null)
  })

  it("exposes four pipeline columns", () => {
    assert.deepEqual([...KANBAN_PIPELINE_COLUMNS], [
      "selected",
      "applied",
      "interview",
      "offer",
    ])
  })
})
