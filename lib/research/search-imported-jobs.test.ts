import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { filterImportedJobRows } from "@/lib/research/search-imported-jobs"
import {
  getSourceCapability,
  includesAllImportedJobs,
} from "@/lib/sources/capabilities"
import { MY_IMPORTED_SOURCE_SLUG } from "@/lib/sources/constants"

const now = new Date("2026-09-11T12:00:00.000Z")

function row(
  overrides: Partial<Parameters<typeof filterImportedJobRows>[0][number]> & {
    id: string
    url: string
  }
) {
  return {
    title: "Product Owner",
    company: "Acme",
    city: "Marseille",
    country: "FR",
    description: "PO mission",
    source: "csv",
    published_at: "2026-09-10T10:00:00.000Z",
    scraped_at: null,
    remote_mode: null,
    contract_type: "CDI",
    salary_min: null,
    salary_max: null,
    ...overrides,
  }
}

describe("includesAllImportedJobs", () => {
  it("detects my-imported slug", () => {
    assert.equal(includesAllImportedJobs(["france-travail"]), false)
    assert.equal(
      includesAllImportedJobs(["france-travail", MY_IMPORTED_SOURCE_SLUG]),
      true
    )
  })
})

describe("getSourceCapability(my-imported)", () => {
  it("is imported_only library for the whole board", () => {
    const cap = getSourceCapability(MY_IMPORTED_SOURCE_SLUG)
    assert.equal(cap.capability, "imported_only")
    assert.equal(cap.liveReady, false)
    assert.match(cap.detail, /toutes sources/i)
  })
})

describe("filterImportedJobRows with my-imported", () => {
  it("matches all platforms when my-imported is selected", () => {
    const rows = [
      row({ id: "1", url: "https://a.example/1", source: "csv" }),
      row({ id: "2", url: "https://a.example/2", source: "indeed" }),
      row({
        id: "3",
        url: "https://a.example/3",
        source: "welcome_to_the_jungle",
      }),
    ]
    const filtered = filterImportedJobRows(
      rows,
      {
        roles: ["Product Owner"],
        keywords: [],
        location: "Marseille",
        published_within_hours: 48,
        source_slugs: [MY_IMPORTED_SOURCE_SLUG],
      },
      { now }
    )
    assert.equal(filtered.length, 3)
  })

  it("still filters by platform when my-imported is absent", () => {
    const rows = [
      row({ id: "1", url: "https://a.example/1", source: "csv" }),
      row({ id: "2", url: "https://a.example/2", source: "indeed" }),
    ]
    const filtered = filterImportedJobRows(
      rows,
      {
        roles: ["Product Owner"],
        keywords: [],
        location: "Marseille",
        published_within_hours: 48,
        source_slugs: ["indeed"],
      },
      { now }
    )
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0]?.id, "2")
  })
})
