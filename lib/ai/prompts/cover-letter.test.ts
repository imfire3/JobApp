import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  COVER_LETTER_PROMPT_VERSION,
  COVER_LETTER_SYSTEM_PROMPT,
  buildCoverLetterUserPrompt,
} from "@/lib/ai/prompts/cover-letter"

describe("cover letter prompt v4", () => {
  it("bumps prompt version for coach pack output", () => {
    assert.equal(COVER_LETTER_PROMPT_VERSION, "v4")
  })

  it("requires angle + letter + coach notes JSON pack", () => {
    assert.match(COVER_LETTER_SYSTEM_PROMPT, /angle_briefing/)
    assert.match(COVER_LETTER_SYSTEM_PROMPT, /coach_notes/)
    assert.match(COVER_LETTER_SYSTEM_PROMPT, /un seul angle/)
    assert.match(COVER_LETTER_SYSTEM_PROMPT, /N’invente aucune/)
    assert.match(COVER_LETTER_SYSTEM_PROMPT, /transparence courte/)
  })

  it("includes match_context and job posting in the user prompt", () => {
    const prompt = buildCoverLetterUserPrompt({
      cvText: "PO Fortuneo +9% conversion",
      title: "Product Builder",
      company: "Hello Pomelo",
      city: "Marseille",
      contractType: "CDI",
      remoteMode: "hybrid",
      salaryMin: null,
      salaryMax: null,
      experienceMinYears: 2,
      summary: "DXP product builder",
      profile: "UX UI Figma",
      skills: ["Figma", "IA"],
      description: "CMS headless et architectures composables",
      aiSummary: null,
      url: "https://example.com/job",
      matchContext: {
        coverLetterAngle: "Builder + IA, pas DXP",
        scoreExplanation: "Score 55/100 — gap CMS headless",
        matchGaps: ["CMS headless"],
        weakCriteria: ["DXP"],
      },
    })
    assert.match(prompt, /<match_context>/)
    assert.match(prompt, /Builder \+ IA/)
    assert.match(prompt, /CMS headless/)
    assert.match(prompt, /<cv_text>/)
    assert.match(prompt, /Hello Pomelo/)
  })
})
