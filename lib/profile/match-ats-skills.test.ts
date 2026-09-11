import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  listAtsSkillOptions,
  matchAtsSkillsFromCvText,
  mergeSkillLists,
} from "@/lib/profile/match-ats-skills"

describe("matchAtsSkillsFromCvText", () => {
  it("finds catalog skills in CV text", () => {
    const skills = matchAtsSkillsFromCvText(
      "Product Owner expérimenté. Agile, Scrum, Jira, SQL et Figma au quotidien."
    )
    assert.ok(skills.length > 0)
    const lower = skills.map((s) => s.toLowerCase())
    assert.ok(
      lower.some((s) => s.includes("scrum") || s.includes("agile") || s.includes("jira"))
    )
  })

  it("merges skill lists without duplicates", () => {
    assert.deepEqual(mergeSkillLists(["SQL", "Agile"], ["agile", "Figma"]), [
      "SQL",
      "Agile",
      "Figma",
    ])
  })

  it("lists ATS skill options", () => {
    const options = listAtsSkillOptions()
    assert.ok(options.length > 20)
  })
})
