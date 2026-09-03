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

  it("is done once CV is present", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
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
  it("requires only a CV", () => {
    assert.equal(
      canCompleteOnboarding({
        hasCv: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
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
  it("is true when a CV already exists", () => {
    assert.equal(
      shouldAutoComplete({
        hasCv: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
      }),
      true
    );
  });
});
