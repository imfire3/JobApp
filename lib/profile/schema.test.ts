import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { candidateProfileUpdateSchema } from "./schema"
import {
  formatDisplayDate,
  parseDisplayDateToIso,
} from "./helpers"

describe("candidateProfileUpdateSchema", () => {
  it("accepts a valid LinkedIn URL and normalizes bare domains", () => {
    const parsed = candidateProfileUpdateSchema.parse({
      linkedin_url: "www.linkedin.com/in/vincent",
      website_url: "https://example.com",
      contact_email: "Vincent@Example.com",
      phone: "0699114226",
      date_of_birth: "02/11/1998",
      github_url: "https://github.com/imfire3",
    })

    assert.equal(parsed.linkedin_url, "https://www.linkedin.com/in/vincent")
    assert.equal(parsed.website_url, "https://example.com")
    assert.equal(parsed.contact_email, "vincent@example.com")
    assert.equal(parsed.date_of_birth, "1998-11-02")
    assert.equal(parsed.phone, "0699114226")
    assert.equal(parsed.github_url, "https://github.com/imfire3")
  })

  it("allows nulling optional contact fields", () => {
    const parsed = candidateProfileUpdateSchema.parse({
      phone: null,
      linkedin_url: "",
      contact_email: "",
      date_of_birth: "",
      github_url: null,
    })

    assert.equal(parsed.phone, null)
    assert.equal(parsed.linkedin_url, null)
    assert.equal(parsed.contact_email, null)
    assert.equal(parsed.date_of_birth, null)
    assert.equal(parsed.github_url, null)
  })

  it("rejects invalid dates of birth", () => {
    assert.throws(() =>
      candidateProfileUpdateSchema.parse({
        date_of_birth: "not-a-date",
      })
    )
  })

  it("rejects invalid contact emails", () => {
    assert.throws(() =>
      candidateProfileUpdateSchema.parse({
        contact_email: "not-an-email",
      })
    )
  })
})

describe("date helpers", () => {
  it("round-trips display dates", () => {
    assert.equal(formatDisplayDate("1998-11-02"), "02/11/1998")
    assert.equal(parseDisplayDateToIso("02/11/1998"), "1998-11-02")
    assert.equal(parseDisplayDateToIso(""), null)
  })
})
