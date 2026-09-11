import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseCoverLetterPack } from "@/lib/ai/schemas/cover-letter"

describe("parseCoverLetterPack", () => {
  it("parses a normal structured pack", () => {
    const pack = parseCoverLetterPack({
      angle_briefing: "Angle Builder + IA.",
      subject: "Candidature — Product Builder",
      letter: "Bonjour,\n\nJe candidate…\n\nÀ bientôt,",
      coach_notes: ["Ne pas inventer DXP", "Pousser CatDex"],
    })
    assert.match(pack.angle_briefing, /Builder/)
    assert.match(pack.subject, /Product Builder/)
    assert.match(pack.letter, /Bonjour/)
    assert.equal(pack.coach_notes.length, 2)
  })

  it("accepts letter alias content and coerces missing notes", () => {
    const pack = parseCoverLetterPack({
      angle_briefing: "",
      subject: "",
      content: "Bonjour l’équipe,\n\nVoici ma lettre.",
      coach_notes: null,
    })
    assert.equal(pack.letter, "Bonjour l’équipe,\n\nVoici ma lettre.")
    assert.deepEqual(pack.coach_notes, [])
  })

  it("falls back to prose-only letter when JSON is absent", () => {
    const pack = parseCoverLetterPack(
      "Bonjour,\n\nLettre en texte brut uniquement.\n\nCordialement,"
    )
    assert.equal(pack.angle_briefing, "")
    assert.match(pack.letter, /texte brut/)
    assert.deepEqual(pack.coach_notes, [])
  })

  it("parses JSON string payloads", () => {
    const pack = parseCoverLetterPack(
      JSON.stringify({
        angle_briefing: "Fit partiel",
        subject: "Candidature",
        letter: "Bonjour,",
        coach_notes: "• Note A\n• Note B",
      })
    )
    assert.equal(pack.coach_notes.length, 2)
    assert.equal(pack.coach_notes[0], "Note A")
  })

  it("rejects empty letter", () => {
    assert.throws(() => parseCoverLetterPack({ letter: "" }), /Empty cover letter/)
  })
})
