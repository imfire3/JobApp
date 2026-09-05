import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canCompleteOnboarding,
  deriveOnboardingStep,
  shouldAutoComplete,
} from "@/lib/onboarding/status";

describe("deriveOnboardingStep", () => {
  it("starts at cv when nothing is ready", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: false,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "cv"
    );
  });

  it("moves to metiers once CV is present", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "metiers"
    );
  });

  it("is done once CV and tracked search exist", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: false,
        hasTrackedSearch: true,
        completed: false,
      }),
      "done"
    );
  });

  it("returns done when completed flag is true", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: false,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: true,
      }),
      "done"
    );
  });
});

describe("canCompleteOnboarding", () => {
  it("requires a CV and a tracked search", () => {
    assert.equal(
      canCompleteOnboarding({
        hasCv: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      false
    );
    assert.equal(
      canCompleteOnboarding({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: false,
        hasTrackedSearch: true,
        completed: false,
      }),
      true
    );
    assert.equal(
      canCompleteOnboarding({
        hasCv: false,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
        completed: false,
      }),
      false
    );
  });
});

describe("shouldAutoComplete", () => {
  it("is true only when CV and tracked search already exist", () => {
    assert.equal(
      shouldAutoComplete({
        hasCv: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
      }),
      false
    );
    assert.equal(
      shouldAutoComplete({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: false,
        hasTrackedSearch: true,
      }),
      true
    );
  });
});
