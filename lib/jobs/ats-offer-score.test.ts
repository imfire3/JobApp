import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  computeAtsOfferScore,
  parseAtsBreakdown,
} from "@/lib/jobs/ats-offer-score"

describe("computeAtsOfferScore", () => {
  it("scores keywords and list overlaps in the normal case", () => {
    const result = computeAtsOfferScore({
      keywordsMatched: ["Agile", "Roadmap", "KPI"],
      keywordsMissing: ["SQL"],
      jobSkills: ["Agile", "Discovery"],
      jobTools: ["Jira", "Figma"],
      jobTitle: "Product Owner",
      jobExperienceYears: 5,
      cvText:
        "Product Owner avec 6 ans d'expérience. Agile, discovery utilisateurs, Jira et Figma au quotidien. KPI et roadmap.",
      cvSkills: ["Agile", "Discovery"],
      cvTools: ["Jira", "Figma"],
      cvTargetRoles: ["Product Owner", "Product Manager"],
      cvYearsExperience: 6,
    })

    assert.equal(result.ats_breakdown.keywords, 75)
    assert.equal(result.ats_breakdown.skills, 100)
    assert.equal(result.ats_breakdown.tools, 100)
    assert.equal(result.ats_breakdown.title, 100)
    assert.equal(result.ats_breakdown.experience, 100)
    assert.ok(typeof result.ats_score === "number")
    assert.ok(result.ats_score! >= 90)
  })

  it("returns null global score when no dimensions are available", () => {
    const result = computeAtsOfferScore({
      keywordsMatched: [],
      keywordsMissing: [],
      jobSkills: [],
      jobTools: [],
      jobTitle: "",
      jobExperienceYears: null,
      cvText: "",
      cvSkills: [],
      cvTools: [],
      cvTargetRoles: [],
      cvYearsExperience: null,
    })
    assert.equal(result.ats_score, null)
    assert.equal(result.ats_breakdown.keywords, null)
    assert.equal(result.ats_breakdown.skills, null)
    assert.equal(result.ats_breakdown.tools, null)
    assert.equal(result.ats_breakdown.title, null)
    assert.equal(result.ats_breakdown.experience, null)
  })

  it("renormalizes weights when experience is missing", () => {
    const result = computeAtsOfferScore({
      keywordsMatched: ["A", "B"],
      keywordsMissing: ["C", "D"],
      jobSkills: ["A"],
      jobTools: [],
      jobTitle: "Product Manager",
      jobExperienceYears: null,
      cvText: "Product Manager — A and B",
      cvSkills: ["A"],
      cvTools: [],
      cvTargetRoles: ["Product Manager"],
      cvYearsExperience: null,
    })
    assert.equal(result.ats_breakdown.experience, null)
    assert.equal(result.ats_breakdown.keywords, 50)
    assert.equal(result.ats_breakdown.skills, 100)
    assert.equal(result.ats_breakdown.title, 100)
    assert.ok(typeof result.ats_score === "number")
  })

  it("scores partial skill overlap from CV text", () => {
    const result = computeAtsOfferScore({
      keywordsMatched: [],
      keywordsMissing: [],
      jobSkills: ["Scrum", "SQL", "Python"],
      jobTools: ["Tableau"],
      jobTitle: "Data PM",
      jobExperienceYears: 3,
      cvText: "Scrum master pendant 2 ans. Utilise Tableau.",
      cvSkills: [],
      cvTools: [],
      cvTargetRoles: [],
      cvYearsExperience: 2,
    })
    assert.equal(result.ats_breakdown.skills, 33)
    assert.equal(result.ats_breakdown.tools, 100)
    assert.equal(result.ats_breakdown.experience, 67)
  })

  it("parses stored breakdown safely", () => {
    assert.equal(parseAtsBreakdown(null), null)
    assert.deepEqual(
      parseAtsBreakdown({
        skills: 80.4,
        keywords: 50,
        experience: null,
        title: 90,
        tools: 10,
        extra: true,
      }),
      {
        skills: 80,
        keywords: 50,
        experience: null,
        title: 90,
        tools: 10,
      }
    )
  })
})
