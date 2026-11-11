import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  CV_EXPERIENCES_MARKER,
  formatExperienceBlock,
  formatMonthYear,
  isMonthYearValid,
  mergeExperiencesIntoCvText,
  parseExperiencesSection,
  parseMonthYear,
  type CvExperience,
} from "@/lib/cv/experiences"

const sample: CvExperience = {
  id: "1",
  title: "Product Owner",
  organization: "Fortuneo",
  location: "Paris",
  locationType: "hybrid",
  employmentType: "CDI",
  isCurrent: true,
  startMonth: "01",
  startYear: "2024",
  endMonth: "",
  endYear: "",
  highlights: "Amélioration du funnel\nOwnership KYC",
  skills: ["Discovery", "Agile"],
}

describe("formatExperienceBlock", () => {
  it("formats title, org, period and highlights", () => {
    const block = formatExperienceBlock(sample)
    assert.match(block, /Product Owner — Fortuneo/)
    assert.match(block, /présent/)
    assert.match(block, /• Amélioration du funnel/)
    assert.match(block, /Compétences : Discovery, Agile/)
  })
})

describe("mergeExperiencesIntoCvText", () => {
  it("is a no-op when there are no pending experiences", () => {
    assert.equal(mergeExperiencesIntoCvText("Hello CV", []), "Hello CV")
  })

  it("creates a marked section on first add", () => {
    const merged = mergeExperiencesIntoCvText("Profil PM", [sample])
    assert.match(merged, new RegExp(CV_EXPERIENCES_MARKER))
    assert.match(merged, /Product Owner — Fortuneo/)
  })

  it("replaces the managed section when the marker already exists", () => {
    const existing = `Profil\n\n${CV_EXPERIENCES_MARKER}\n\nOld role — Acme`
    const merged = mergeExperiencesIntoCvText(existing, [sample])
    assert.doesNotMatch(merged, /Old role — Acme/)
    assert.match(merged, /Product Owner — Fortuneo/)
    assert.match(merged, new RegExp(CV_EXPERIENCES_MARKER))
  })

  it("is idempotent: merging twice does not duplicate the section", () => {
    const once = mergeExperiencesIntoCvText("Profil PM", [sample])
    const twice = mergeExperiencesIntoCvText(once, [sample])
    assert.equal(twice, once)
    assert.equal(twice.match(new RegExp(CV_EXPERIENCES_MARKER, "g"))?.length, 1)
  })
})

describe("formatMonthYear / parseMonthYear", () => {
  it("formats a month and a year as MM/AAAA", () => {
    assert.equal(formatMonthYear("3", "2021"), "03/2021")
    assert.equal(formatMonthYear("01", ""), "")
  })

  it("parses MM/AAAA in both orders", () => {
    assert.deepEqual(parseMonthYear("03/2021"), { month: "03", year: "2021" })
    assert.deepEqual(parseMonthYear("2021-03"), { month: "03", year: "2021" })
    assert.deepEqual(parseMonthYear("13/2021"), { month: "", year: "2021" })
    assert.deepEqual(parseMonthYear("abc"), { month: "", year: "" })
  })

  it("validates the MM/AAAA format", () => {
    assert.equal(isMonthYearValid("03/2021"), true)
    assert.equal(isMonthYearValid("3/2021"), true)
    assert.equal(isMonthYearValid("03/21"), false)
    assert.equal(isMonthYearValid(""), false)
  })
})

describe("parseExperiencesSection", () => {
  it("returns an empty list when there is no managed section", () => {
    assert.deepEqual(parseExperiencesSection("Profil simple"), [])
  })

  it("reads back title, organization, dates and highlights", () => {
    const past: CvExperience = {
      ...sample,
      isCurrent: false,
      endMonth: "09",
      endYear: "2022",
      highlights: "• Amélioration du funnel\n• Ownership KYC",
    }
    const cvText = mergeExperiencesIntoCvText("Profil PM", [past])
    const parsed = parseExperiencesSection(cvText)

    assert.equal(parsed.length, 1)
    assert.equal(parsed[0].title, "Product Owner")
    assert.equal(parsed[0].organization, "Fortuneo")
    assert.equal(parsed[0].location, "Paris")
    assert.equal(parsed[0].locationType, "hybrid")
    assert.equal(parsed[0].employmentType, "CDI")
    assert.equal(parsed[0].startMonth, "01")
    assert.equal(parsed[0].startYear, "2024")
    assert.equal(parsed[0].endMonth, "09")
    assert.equal(parsed[0].endYear, "2022")
    assert.equal(parsed[0].isCurrent, false)
    assert.match(parsed[0].highlights, /Amélioration du funnel/)
    assert.deepEqual(parsed[0].skills, ["Discovery", "Agile"])
  })

  it("restores an ongoing experience without end date", () => {
    const cvText = mergeExperiencesIntoCvText("Profil PM", [sample])
    const parsed = parseExperiencesSection(cvText)

    assert.equal(parsed.length, 1)
    assert.equal(parsed[0].isCurrent, true)
    assert.equal(parsed[0].endMonth, "")
    assert.equal(parsed[0].endYear, "")
    assert.equal(parsed[0].startMonth, "01")
    assert.equal(parsed[0].startYear, "2024")
  })

  it("round-trips the section without losing dates", () => {
    const cvText = mergeExperiencesIntoCvText("Profil PM", [sample])
    assert.equal(
      mergeExperiencesIntoCvText(cvText, parseExperiencesSection(cvText)).trim(),
      cvText.trim()
    )
  })
})
