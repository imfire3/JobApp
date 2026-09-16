import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { hoursToPublieeDepuis } from "./hours-to-publiee-depuis"

describe("hoursToPublieeDepuis", () => {
  it("maps 48h to 2 days", () => {
    assert.equal(hoursToPublieeDepuis(48), 2)
  })

  it("maps 24h to 1 day and caps at 31", () => {
    assert.equal(hoursToPublieeDepuis(24), 1)
    assert.equal(hoursToPublieeDepuis(12), 1)
    assert.equal(hoursToPublieeDepuis(24 * 40), 31)
  })
})
