import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  SEARCH_LOCATIONS_FR,
  filterCatalogOptions,
  mapContractTypesForActor,
  mapRemoteForActor,
} from "@/lib/jobs/search-filter-catalogs"
import { trackedSearchWriteSchema } from "@/lib/jobs/tracked-search-schema"
import { buildActorInput } from "@/lib/connectors/apify"
import type { TrackedSearch } from "@/types"

describe("SEARCH_LOCATIONS_FR", () => {
  it("includes France and major cities", () => {
    assert.ok(SEARCH_LOCATIONS_FR.includes("France"))
    assert.ok(SEARCH_LOCATIONS_FR.includes("Paris"))
    assert.ok(SEARCH_LOCATIONS_FR.includes("Lyon"))
    assert.ok(SEARCH_LOCATIONS_FR.includes("Bordeaux"))
    assert.ok(SEARCH_LOCATIONS_FR.includes("Île-de-France"))
  })
})

describe("filterCatalogOptions", () => {
  it("filters accent-insensitive", () => {
    const hits = filterCatalogOptions(SEARCH_LOCATIONS_FR, "ile-de-france")
    assert.ok(hits.some((h) => h.value.includes("Île-de-France") || h.label.includes("Île")))
  })
})

describe("mapContractTypesForActor / mapRemoteForActor", () => {
  it("maps CDI and remote_only", () => {
    assert.deepEqual(mapContractTypesForActor(["CDI", "Freelance"]), [
      "full_time",
      "freelance",
    ])
    assert.deepEqual(mapRemoteForActor("remote_only"), ["fulltime"])
    assert.deepEqual(mapRemoteForActor("hybrid"), ["partial"])
  })
})

describe("trackedSearchWriteSchema", () => {
  it("accepts WTTJ filter payload", () => {
    const parsed = trackedSearchWriteSchema.parse({
      name: "PO Paris",
      locations: ["Paris", "Lyon"],
      languages: ["fr", "en"],
      expertises: ["product"],
      contract_types: ["CDI"],
      salary_period: "year",
      minimum_salary: 50000,
      maximum_salary: 70000,
      only_with_salary: true,
      exclusive_only: false,
      top_recruiter_only: false,
      company_names: ["Acme"],
      start_date_preference: "asap",
      publish_window: "7",
    })
    assert.equal(parsed.name, "PO Paris")
    assert.deepEqual(parsed.locations, ["Paris", "Lyon"])
    assert.equal(parsed.salary_period, "year")
  })

  it("rejects short names", () => {
    assert.throws(() => trackedSearchWriteSchema.parse({ name: "A" }))
  })
})

describe("buildActorInput", () => {
  it("includes new filter fields", () => {
    const trackedSearch = {
      id: "1",
      user_id: "u",
      name: "Test",
      enabled: true,
      job_titles: ["Product Owner"],
      keywords: [],
      excluded_keywords: [],
      locations: ["Paris"],
      maximum_distance: null,
      remote_preference: "hybrid",
      hybrid: true,
      on_site: false,
      experience: [],
      contract_types: ["CDI"],
      minimum_salary: 55000,
      maximum_salary: 75000,
      salary_period: "year",
      currency: "EUR",
      industries: [],
      excluded_industries: [],
      company_size: null,
      company_culture: null,
      company_names: ["Acme"],
      languages: ["fr"],
      expertises: ["product"],
      only_with_salary: true,
      exclusive_only: false,
      top_recruiter_only: false,
      start_date_preference: "asap",
      publish_window: "7",
      ai_preferences: {},
      minimum_match_score: null,
      last_run: null,
      next_run: null,
      jobs_found_today: 0,
      jobs_imported: 0,
      duplicates_removed: 0,
      average_ai_score: null,
      created_at: "",
      updated_at: "",
    } satisfies TrackedSearch

    const input = buildActorInput({
      trackedSearch,
      query: "Product Owner",
      location: "Paris",
      roles: ["Product Owner"],
      keywords: [],
      excludedKeywords: [],
      maxResults: 50,
    })

    assert.deepEqual(input.locations, ["Paris"])
    assert.deepEqual(input.contractTypes, ["full_time"])
    assert.deepEqual(input.remoteTypes, ["partial"])
    assert.equal(input.salaryMin, 55000)
    assert.equal(input.salaryMax, 75000)
    assert.equal(input.websiteCountry, "fr")
    assert.deepEqual(input.languages, ["fr"])
  })
})
