import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  canCompleteOnboarding,
  deriveOnboardingStep,
} from "./status"

describe("deriveOnboardingStep", () => {
  it("starts at cv when nothing is ready", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: false,
        hasProfileReviewed: false,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "cv"
    )
  })

  it("moves to profile once CV is present", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasProfileReviewed: false,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "profile"
    )
  })

  it("completes after profile review without requiring API keys", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasProfileReviewed: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "done"
    )
  })

  it("returns done when completed flag is true", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: false,
        hasProfileReviewed: false,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: true,
      }),
      "done"
    )
  })
})

describe("canCompleteOnboarding", () => {
  it("requires CV and profile review", () => {
    assert.equal(
      canCompleteOnboarding({
        hasCv: true,
        hasProfileReviewed: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      true
    )
    assert.equal(
      canCompleteOnboarding({
        hasCv: true,
        hasProfileReviewed: false,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
        completed: false,
      }),
      false
    )
    assert.equal(
      canCompleteOnboarding({
        hasCv: false,
        hasProfileReviewed: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
        completed: false,
      }),
      false
    )
  })
})
