import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  GENERIC_RESUME_FIXTURE,
  GENERIC_RESUME_NO_LANGUAGES,
} from "@/lib/resume/fixtures/generic-cv"
import { extractRegexContact } from "@/lib/resume/regex-contact"
import { detectResumeSections, getSectionContent } from "@/lib/resume/section-detect"
import { mapParsedResumeToProfileDraft } from "@/lib/resume/map-to-profile"
import { field, type ParsedResume } from "@/lib/resume/types"
import { normalizeLabel, fuzzyScore } from "@/lib/resume/matchers"
import { isTextInsufficient, normalizeResumeText } from "@/lib/resume/normalize-text"

describe("extractRegexContact", () => {
  it("extracts contact, name, title, linkedin and github from header", () => {
    const contact = extractRegexContact(GENERIC_RESUME_FIXTURE)
    assert.equal(contact.firstName?.value, "Alex")
    assert.equal(contact.lastName?.value, "Durand")
    assert.equal(contact.email?.value, "alex.durand@example.com")
    assert.ok(contact.phone?.value?.includes("06"))
    assert.equal(contact.linkedin?.value, "https://linkedin.com/in/alex-durand-po")
    assert.equal(contact.github?.value, "https://github.com/alexdurand")
    assert.match(contact.currentPosition?.value ?? "", /Product Owner/i)
  })

  it("extracts linkedin.com URLs without stripping the domain", () => {
    const contact = extractRegexContact(GENERIC_RESUME_NO_LANGUAGES)
    assert.equal(
      contact.linkedin?.value,
      "https://linkedin.com/in/jordan-martin"
    )
    assert.equal(contact.github?.value, "https://github.com/jordanmartin")
  })
})

describe("detectResumeSections", () => {
  it("splits experiences, education, skills and languages", () => {
    const sections = detectResumeSections(GENERIC_RESUME_FIXTURE)
    const ids = sections.map((s) => s.id)
    assert.ok(ids.includes("header"))
    assert.ok(ids.includes("experience"))
    assert.ok(ids.includes("education"))
    assert.ok(ids.includes("skills"))
    assert.ok(ids.includes("languages"))

    const experience = getSectionContent(sections, "experience")
    assert.match(experience, /Banque Digitale/i)
    assert.match(experience, /Marketplace Co/i)

    const education = getSectionContent(sections, "education")
    assert.match(education, /École Digitale/i)
    assert.match(education, /Université Tech/i)
  })
})

describe("mapParsedResumeToProfileDraft", () => {
  it("maps 4 experiences, 2 educations, skills, contact; leaves birth empty", () => {
    const parsed: ParsedResume = {
      personalInformation: {
        firstName: field("Alex", 0.95, "regex"),
        lastName: field("Durand", 0.95, "regex"),
        email: field("alex.durand@example.com", 0.99, "regex"),
        phone: field("06 12 34 56 78", 0.97, "regex"),
        currentPosition: field("Product Owner / Product Manager", 0.9, "heuristic"),
      },
      experiences: [
        {
          jobTitle: field("Product Owner", 0.9, "llm"),
          company: field("Banque Digitale SA", 0.9, "llm"),
          startDate: field("2023-01", 0.85, "llm"),
          current: field(true, 0.9, "llm"),
        },
        {
          jobTitle: field("Product Manager", 0.9, "llm"),
          company: field("Fintech Startup", 0.9, "llm"),
          startDate: field("2021-06", 0.85, "llm"),
          endDate: field("2022-12", 0.85, "llm"),
          current: field(false, 0.9, "llm"),
        },
        {
          jobTitle: field("Consultant Produit", 0.9, "llm"),
          company: field("Agence Conseil", 0.9, "llm"),
          startDate: field("2020-01", 0.85, "llm"),
          endDate: field("2021-05", 0.85, "llm"),
        },
        {
          jobTitle: field("Product Analyst", 0.9, "llm"),
          company: field("Marketplace Co", 0.9, "llm"),
          startDate: field("2018-09", 0.85, "llm"),
          endDate: field("2019-12", 0.85, "llm"),
        },
      ],
      skills: [
        { name: "Product Discovery", confidence: 0.9 },
        { name: "Agile", confidence: 0.9 },
        { name: "SQL", confidence: 0.9 },
      ],
      languages: [
        { name: "Français", level: "Maternel", confidence: 0.9 },
        { name: "Anglais", level: "Courant", confidence: 0.9 },
      ],
      education: [
        {
          degree: field("Master Product Management", 0.9, "llm"),
          school: field("École Digitale", 0.9, "llm"),
          startDate: field("2016", 0.8, "llm"),
          endDate: field("2018", 0.8, "llm"),
        },
        {
          degree: field("Bachelor Informatique", 0.9, "llm"),
          school: field("Université Tech", 0.9, "llm"),
          startDate: field("2013", 0.8, "llm"),
          endDate: field("2016", 0.8, "llm"),
        },
      ],
      resources: {
        linkedin: field("https://linkedin.com/in/alex-durand-po", 0.96, "regex"),
        github: field("https://github.com/alexdurand", 0.96, "regex"),
      },
      suggestedRoles: ["Product Owner", "Product Manager", "Consultant Produit"],
      meta: { ocrUsed: false, textLength: 1200 },
    }

    const draft = mapParsedResumeToProfileDraft(parsed)
    assert.equal(draft.first_name, "Alex")
    assert.equal(draft.last_name, "Durand")
    assert.equal(draft.contact_email, "alex.durand@example.com")
    assert.equal(draft.experience_entries.length, 4)
    assert.equal(draft.education_entries.length, 2)
    assert.ok(draft.skills.includes("SQL"))
    assert.equal(draft.language_entries.length, 2)
    assert.equal(draft.date_of_birth, null)
    assert.equal(draft.current_city, null)
    assert.deepEqual(draft.target_roles, [])
    assert.ok(draft.suggested_roles.includes("Product Owner"))
    assert.equal(draft.linkedin_url, "https://linkedin.com/in/alex-durand-po")
    assert.equal(draft.github_url, "https://github.com/alexdurand")
  })

  it("drops low-confidence fields and empty languages/location when absent", () => {
    const parsed: ParsedResume = {
      personalInformation: {
        firstName: field("Jordan", 0.4, "llm"),
        email: field("jordan.martin@example.org", 0.99, "regex"),
      },
      experiences: [],
      skills: [{ name: "React", confidence: 0.5 }],
      languages: [],
      education: [],
      resources: {},
      suggestedRoles: [],
      meta: { ocrUsed: true, textLength: 400 },
    }
    const draft = mapParsedResumeToProfileDraft(parsed)
    assert.equal(draft.first_name, null)
    assert.equal(draft.contact_email, "jordan.martin@example.org")
    assert.deepEqual(draft.skills, [])
    assert.deepEqual(draft.language_entries, [])
    assert.equal(draft.current_city, null)
    assert.equal(draft.date_of_birth, null)
  })
})

describe("matchers + normalize", () => {
  it("normalizes accents and scores fuzzy labels", () => {
    assert.equal(normalizeLabel("Expérience"), "experience")
    assert.ok(fuzzyScore("Product Owner", "product owner") === 1)
  })

  it("detects insufficient text", () => {
    assert.equal(isTextInsufficient("hi"), true)
    assert.equal(
      isTextInsufficient(normalizeResumeText(GENERIC_RESUME_FIXTURE)),
      false
    )
  })
})
