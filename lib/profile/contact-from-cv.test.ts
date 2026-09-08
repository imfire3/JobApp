import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  extractContactFromCvText,
  mergeContactIntoExtract,
} from "./contact-from-cv"
import type { CvExtractedProfile } from "@/lib/ai/schemas/cv-extract"

const ANNOTATED_HEADER = `Vincent Giacalone
Product Manager / Product Owner — Growth, AI & Automation
vincentgiacalonepro@gmail.com
Linkedin : @vincentgiacalone
Github : imfire3
Telephone : +33 6 99 11 42 26

EXPERIENCE
Product Owner — Fortuneo
`

describe("extractContactFromCvText", () => {
  it("extracts name, email, phone, LinkedIn and GitHub from annotated header", () => {
    const contact = extractContactFromCvText(ANNOTATED_HEADER)

    assert.equal(contact.first_name, "Vincent")
    assert.equal(contact.last_name, "Giacalone")
    assert.equal(contact.email, "vincentgiacalonepro@gmail.com")
    assert.equal(contact.phone, "+33 6 99 11 42 26")
    assert.equal(contact.linkedin_url, "https://linkedin.com/in/vincentgiacalone")
    assert.equal(contact.github_url, "https://github.com/imfire3")
    assert.equal(
      contact.current_title,
      "Product Manager / Product Owner — Growth, AI & Automation"
    )
  })

  it("does not invent contact fields when absent", () => {
    const contact = extractContactFromCvText(
      "Senior Product Manager\n\nBuilt roadmaps and discovery loops."
    )

    assert.equal(contact.first_name, null)
    assert.equal(contact.last_name, null)
    assert.equal(contact.email, null)
    assert.equal(contact.phone, null)
    assert.equal(contact.linkedin_url, null)
    assert.equal(contact.github_url, null)
  })
})

describe("mergeContactIntoExtract", () => {
  it("fills AI holes from regex contact without overwriting AI values", () => {
    const ai: CvExtractedProfile = {
      first_name: "Vincent",
      last_name: null,
      email: null,
      phone: null,
      date_of_birth: null,
      current_city: null,
      current_title: null,
      linkedin_url: null,
      github_url: null,
      website_url: null,
      skills: ["Figma"],
      experience_entries: [],
      education_entries: [],
      language_entries: [],
    }

    const contact = extractContactFromCvText(ANNOTATED_HEADER)
    const merged = mergeContactIntoExtract(ai, contact)

    assert.equal(merged.first_name, "Vincent")
    assert.equal(merged.last_name, "Giacalone")
    assert.equal(merged.email, "vincentgiacalonepro@gmail.com")
    assert.equal(merged.phone, "+33 6 99 11 42 26")
    assert.equal(merged.linkedin_url, "https://linkedin.com/in/vincentgiacalone")
    assert.equal(merged.github_url, "https://github.com/imfire3")
    assert.deepEqual(merged.skills, ["Figma"])
  })
})
