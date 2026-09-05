import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  CV_EXPERIENCES_MARKER,
  formatExperienceBlock,
  mergeExperiencesIntoCvText,
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

  it("appends when the marker already exists", () => {
    const existing = `Profil\n\n${CV_EXPERIENCES_MARKER}\n\nOld role — Acme`
    const merged = mergeExperiencesIntoCvText(existing, [sample])
    assert.match(merged, /Old role — Acme/)
    assert.match(merged, /Product Owner — Fortuneo/)
  })
})
