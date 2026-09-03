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

  it("moves to targets after CV", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "targets"
    );
  });

  it("moves to analysis after targets", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "analysis"
    );
  });

  it("moves to search after analysis", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: false,
        completed: false,
      }),
      "search"
    );
  });

  it("moves to collect after search (optional step)", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
        completed: false,
      }),
      "collect"
    );
  });

  it("returns done when completed flag is true", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
        completed: true,
      }),
      "done"
    );
  });
});

describe("canCompleteOnboarding", () => {
  it("requires cv, targets, analysis, and tracked search", () => {
    assert.equal(
      canCompleteOnboarding({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
        completed: false,
      }),
      true
    );
    assert.equal(
      canCompleteOnboarding({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: false,
        completed: false,
      }),
      false
    );
  });
});

describe("shouldAutoComplete", () => {
  it("is true when all prerequisites already exist", () => {
    assert.equal(
      shouldAutoComplete({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
      }),
      true
    );
  });
});
