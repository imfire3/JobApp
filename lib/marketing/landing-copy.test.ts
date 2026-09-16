import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isLandingLocale,
  resolveLandingLocale,
  landingCopy,
} from "./landing-copy"

describe("landing-copy", () => {
  it("accepts only fr and en", () => {
    assert.equal(isLandingLocale("fr"), true)
    assert.equal(isLandingLocale("en"), true)
    assert.equal(isLandingLocale("de"), false)
    assert.equal(isLandingLocale(null), false)
  })

  it("defaults to fr when storage missing or invalid", () => {
    assert.equal(resolveLandingLocale(null), "fr")
    assert.equal(resolveLandingLocale("nope"), "fr")
    assert.equal(resolveLandingLocale("en"), "en")
  })

  it("exposes matching keys for fr and en", () => {
    const frKeys = Object.keys(landingCopy.fr).sort()
    const enKeys = Object.keys(landingCopy.en).sort()
    assert.deepEqual(frKeys, enKeys)
    assert.equal(landingCopy.fr.brand, "JobTracker")
    assert.ok(landingCopy.fr.heroHeadline.includes("candidature"))
    assert.ok(landingCopy.en.heroHeadline.toLowerCase().includes("application"))
    assert.ok(landingCopy.fr.extensionTitle.toLowerCase().includes("chrome"))
    assert.equal(landingCopy.fr.extensionInstallSteps.length, 5)
    assert.equal(landingCopy.en.extensionUseSteps.length, 5)
  })
})
